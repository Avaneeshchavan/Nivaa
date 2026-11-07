import { readFile, writeFile, realpath, stat } from 'node:fs/promises'
import { extname, relative, resolve, isAbsolute } from 'node:path'
import { inspectCatalog, parseCatalog, readJsonCatalog } from '../lib/medicines/brand-preflight'

async function main() {
  const file = process.argv[2]
  if (!file || process.argv.length !== 3) throw new Error('Use: node --import tsx scripts/preflight-brands.ts data/brands/<file.csv|file.tsv|file.json>')
  const root = await realpath('data/brands')
  const path = await realpath(resolve(file))
  const child = relative(root, path)
  if (child.startsWith('..') || isAbsolute(child)) throw new Error('Place the catalog inside data/brands first')
  const metadata = await stat(path)
  if (!metadata.isFile() || metadata.size > 128 * 1024 * 1024) throw new Error('Expected a catalog file no larger than 128 MiB')
  const extension = extname(path).toLowerCase()
  if (!['.json', '.csv', '.tsv', '.txt'].includes(extension)) throw new Error('Use CSV, TSV/TXT or JSON')
  const text = await readFile(path, 'utf8')
  const rows = extension === '.json' ? readJsonCatalog(text) : parseCatalog(text, extension === '.csv' ? ',' : '\t')
  const report = inspectCatalog(rows)
  const details = [
    '# N1 brand-file preflight', '',
    '**Readiness inspection only. No import or database connection occurred.**', '',
    `Format: ${report.format}; input rows: ${report.rows}.`,
    `Structurally acceptable unique rows: ${report.accepted}; discontinued: ${report.discontinued}; duplicate candidates: ${report.duplicateCandidates}; rows needing review: ${report.reviewRows.length}.`, '',
    report.format === 'UNMAPPED' ? 'Headers are not the named dataset layout. For NRCeS, inspect the linked master files and supplied License.txt before implementing their joins. Do not guess column meanings.' : 'Structural acceptance is not clinical or licensing approval. Duplicate candidates have not been merged. Prices are not used.', '',
    'License status: UNVERIFIED. Owner source selection and package-license review are required.', '',
    'Database bytes added: 0. Final database-size estimate and scale/performance evidence remain pending the N1 implementation.', '',
    '## Rows requiring review', '',
    ...report.reviewRows.map(row => `- Record ${row.row}: ${row.reason}.`), '',
    'Catalog names/compositions and raw column contents are omitted from this tracked report. Raw data stays ignored under data/brands/.', '',
  ].join('\n')
  await writeFile('docs/IMPORT_REPORT.md', details)
  console.log(`Preflight complete: ${report.rows} rows; ${report.format}. See docs/IMPORT_REPORT.md. No database writes.`)
}
main().catch(() => { console.error('Brand preflight failed. Check the local file path, size, quoting and header layout. No import occurred.'); process.exitCode = 1 })
