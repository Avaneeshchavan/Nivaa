import { readFile, writeFile, realpath } from 'node:fs/promises'
import { relative, isAbsolute, extname } from 'node:path'
import { Client } from 'pg'
import { loadEnvConfig } from '@next/env'
import { databaseConnection } from '../lib/database-connection'
import { readNrcesPackage } from '../lib/medicines/nrces-package'
import { readJsonCatalog, parseCatalog, normalizeBrandSearch } from '../lib/medicines/brand-preflight'
import { makeBrand } from '../lib/medicines/brand'
import { insertBrandsSql } from '../lib/medicines/brand-sql'
import { datasetBrand } from '../lib/medicines/dataset'
import { sourceCompositions } from '../lib/medicines/compositions'

let stage = 'input preparation'
async function main() {
  const args = process.argv.slice(2)
  const source = args.includes('--dataset') ? 'SEED_DATASET' : 'SEED_CDCI'
  const path = await realpath(args.find(arg => !arg.startsWith('--')) || 'data/brands/nrces')
  const root = await realpath('data/brands'), child = relative(root,path)
  if (child.startsWith('..') || isAbsolute(child)) throw new Error('Input must be under data/brands')
  const prepared: ReturnType<typeof makeBrand>[] = [], aliases = new Map<string,string>()
  const rejects: { record: number; reason: string }[] = []
  let inputCount = 0, discontinued = 0
  if (source === 'SEED_CDCI') {
    const loaded = await readNrcesPackage(path)
    inputCount = loaded.counts['BrandMaster.txt'] + loaded.issues.filter(issue => issue.file==='BrandMaster.txt' && issue.reason==='Column count mismatch').length
    rejects.push(...loaded.issues.map(issue => ({record: issue.record, reason: `${issue.file}: ${issue.reason}`})))
    for (const row of loaded.brands) {
      // No source system or discontinuation flag: retain unknown, not an inferred approval.
      const brand = makeBrand({ source, sourceId: row.sourceId, name: row.name, formText: row.formText,
        manufacturer: row.manufacturer, compositionText: row.compositionText, system: 'OTHER' })
      prepared.push(brand); aliases.set(brand.id,row.productName)
    }
  } else {
    const text = await readFile(path,'utf8')
    const rows = extname(path).toLowerCase()==='.json' ? readJsonCatalog(text) : parseCatalog(text,extname(path).toLowerCase()==='.csv' ? ',' : '\t')
    inputCount = rows.length
    rows.forEach((row,index) => {
      const flag = row.Is_discontinued?.trim().toLowerCase()
      if (!['true','false','1','0','yes','no'].includes(flag)) { rejects.push({record:index+2,reason:'Missing/unknown discontinued status'}); return }
      const stopped = ['true','1','yes'].includes(flag)
      if (stopped && !args.includes('--include-discontinued')) { discontinued++; return }
      if (!row.id || !row.name || !row.manufacturer_name || !row.type || !row.short_composition1) { rejects.push({record:index+2,reason:'Missing required source fields'}); return }
      prepared.push(datasetBrand(row))
    })
  }
  const unique = new Map<string,ReturnType<typeof makeBrand>>()
  for (const [index,brand] of prepared.entries()) {
    if (brand.name.length>240 || brand.compositionText.length>4000 || brand.formText.length>80 || (brand.manufacturer?.length || 0)>500) {
      rejects.push({record:index+2,reason:'Presentation exceeds Rx snapshot bounds'}); continue
    }
    if (!unique.has(brand.id)) unique.set(brand.id,brand)
  }
  const brands = [...unique.values()]
  const estimated = brands.reduce((sum,b) => sum+Buffer.byteLength(JSON.stringify(b)),0)*3
  const limit = Number(process.env.NIVAA_IMPORT_MAX_DB_MIB || 450)*1024*1024
  if (!Number.isFinite(limit) || limit<=0) throw new Error('Invalid capacity budget')
  const dry = args.includes('--dry-run')
  let inserted = 0, before = 0, after = 0
  if (!dry) {
    if (!args.includes('--license-confirmed')) throw new Error('Use --license-confirmed after owner license review')
    stage = 'environment loading'
    loadEnvConfig(process.cwd(),false,{info(){},error(){}})
    stage = 'verified TLS client configuration'
    const db = new Client({...databaseConnection(process.env.DIRECT_URL),connectionTimeoutMillis:10000})
    stage = 'database connection'
    await db.connect()
    try {
      stage = 'capacity check'
      before = Number((await db.query('SELECT pg_database_size(current_database()) AS bytes')).rows[0].bytes)
      const present = Number((await db.query('SELECT count(*) FROM public."Brand" WHERE source=$1::public."BrandSource"',[source])).rows[0].count)
      if (!present && before+estimated>limit) throw new Error('Estimated capacity exceeds database budget; review catalog subset before import')
      // A committed batch includes its links/aliases atomically. Skip those IDs
      // on resume instead of repeating thousands of network calls.
      const existingIds = new Set((await db.query('SELECT id FROM public."Brand" WHERE source=$1::public."BrandSource"',[source])).rows.map(row=>row.id as string))
      for (let offset=0;offset<brands.length;offset+=400) {
        const batch = brands.slice(offset,offset+400).filter(brand=>!existingIds.has(brand.id))
        if (!batch.length) continue
        await db.query('BEGIN')
        try {
          stage = 'brand batch'
          const result = await db.query(insertBrandsSql,[JSON.stringify(batch)]); inserted += result.rowCount || 0
          const compositionRows = new Map<string,ReturnType<typeof sourceCompositions>[number]>()
          const links: {brandId:string;compositionId:string;order:number}[] = []
          const aliasRows: {brandId:string;alias:string;aliasNormalized:string}[] = []
          for (const brand of batch) {
            sourceCompositions(brand.compositionText,brand.formText).forEach((composition,order) => {
              compositionRows.set(composition.id,composition); links.push({brandId:brand.id,compositionId:composition.id,order})
            })
            const alias = aliases.get(brand.id)
            if (alias) aliasRows.push({brandId:brand.id,alias,aliasNormalized:normalizeBrandSearch(alias)})
          }
          stage = 'composition batch'
          await db.query(`INSERT INTO public."Composition" SELECT * FROM jsonb_to_recordset($1::jsonb) AS x(id text,"genericName" text,"strengthText" text) ON CONFLICT DO NOTHING`,[JSON.stringify([...compositionRows.values()])])
          stage = 'composition links'
          await db.query(`INSERT INTO public."BrandComposition" SELECT * FROM jsonb_to_recordset($1::jsonb) AS x("brandId" text,"compositionId" text,"order" int) ON CONFLICT DO NOTHING`,[JSON.stringify(links)])
          stage = 'alias batch'
          await db.query(`INSERT INTO public."BrandAlias" SELECT * FROM jsonb_to_recordset($1::jsonb) AS x("brandId" text,alias text,"aliasNormalized" text) ON CONFLICT DO NOTHING`,[JSON.stringify(aliasRows)])
          if (offset%4000===0 && Number((await db.query('SELECT pg_database_size(current_database()) AS bytes')).rows[0].bytes)>limit) throw new Error('Capacity budget reached; resume after choosing subset or capacity')
          await db.query('COMMIT')
          if (offset%10000===0) console.log(`Catalog progress: ${Math.min(offset+batch.length,brands.length)}/${brands.length} processed; ${inserted} inserted.`)
        } catch(error) { await db.query('ROLLBACK'); throw error }
      }
      stage = 'legacy composition links'
      const legacy = (await db.query(`SELECT id,"compositionText","formText" FROM public."Brand" WHERE source='LEGACY'`)).rows
      const components = new Map<string,ReturnType<typeof sourceCompositions>[number]>()
      const legacyLinks: {brandId:string;compositionId:string;order:number}[] = []
      for (const brand of legacy) sourceCompositions(brand.compositionText,brand.formText).forEach((component,order) => {
        components.set(component.id,component); legacyLinks.push({brandId:brand.id,compositionId:component.id,order})
      })
      await db.query('BEGIN')
      try {
        await db.query(`INSERT INTO public."Composition" SELECT * FROM jsonb_to_recordset($1::jsonb) AS x(id text,"genericName" text,"strengthText" text) ON CONFLICT DO NOTHING`,[JSON.stringify([...components.values()])])
        await db.query(`INSERT INTO public."BrandComposition" SELECT * FROM jsonb_to_recordset($1::jsonb) AS x("brandId" text,"compositionId" text,"order" int) ON CONFLICT DO NOTHING`,[JSON.stringify(legacyLinks)])
        await db.query('COMMIT')
      } catch(error) { await db.query('ROLLBACK'); throw error }
      await db.query('ANALYZE public."Brand"'); await db.query('ANALYZE public."BrandAlias"')
      after = Number((await db.query('SELECT pg_database_size(current_database()) AS bytes')).rows[0].bytes)
    } finally { await db.end() }
  }
  await writeFile('docs/IMPORT_REPORT.md',[
    '# N1 catalog import report','', `Mode: ${dry ? 'DRY RUN — no DB connection/writes' : 'DATABASE IMPORT'}. Source: ${source}.`,
    source==='SEED_CDCI' ? 'Attribution: NRCeS / C-DAC, Pune, CC BY 4.0 with supplied SNOMED/India conditions; owner confirmed applicable Affiliate License. Source entries normalized and linked for search. No clinical validation claimed.' : 'Owner-supplied dataset. Operator asserted license confirmation; no NRCeS or CC license is presumed. No clinical validation claimed.', '',
    `Input: ${inputCount}; prepared: ${prepared.length}; unique eligible: ${brands.length}; duplicate presentations merged: ${prepared.length-unique.size-rejects.filter(r=>r.reason.includes('bounds')).length}; discontinued skipped: ${discontinued}.`,
    `Rejected/quarantined: ${rejects.length}; inserted this run: ${inserted}; already present on rerun: ${dry ? 'not measured' : brands.length-inserted}.`,
    `Conservative preflight estimate (row JSON × 3): ${estimated} bytes. DB bytes before: ${before}; after: ${after}; added: ${after-before}.`,
    'This estimate is not a plan entitlement check. Import enforces a configurable database-size budget (default 450 MiB) and uses resumable transactional batches. No data is dropped to meet a budget.','',
    'NRCeS has no system/discontinued field: imported system OTHER, discontinuedKnown false. UNKNOWN marketing-license status is not interpreted as discontinued. Existing allopathic/Ayurvedic catalog preserved. Uprise D3 in this release is injection-only.','',
    '| Record | Reason |','| --- | --- |',...rejects.map(r=>`| ${r.record} | ${r.reason} |`),'',
  ].join('\n'))
  console.log(`Catalog ${dry?'preflight':'import'} complete: ${brands.length} unique eligible; ${inserted} inserted. See docs/IMPORT_REPORT.md.`)
}
main().catch((error: unknown) => { const code = error && typeof error==='object' && 'code' in error && typeof error.code==='string' && /^[A-Z0-9]{5}$/.test(error.code) ? error.code : 'none'; const kind = error instanceof Error && ['Error','TypeError','ReferenceError','RangeError','SyntaxError'].includes(error.name) ? error.name : 'Error'; console.error(`Brand import stopped during ${stage}; ${kind}, database code ${code}. Committed batches are safe to resume. Raw data, exception messages and credentials are not logged.`); process.exitCode=1 })
