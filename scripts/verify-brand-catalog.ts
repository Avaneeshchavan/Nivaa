import { loadEnvConfig } from '@next/env'
import { Client } from 'pg'
import { appendFile, readFile, writeFile } from 'node:fs/promises'
import { performance } from 'node:perf_hooks'
import { databaseConnection } from '../lib/database-connection'
import { brandSearchSql, searchArguments } from '../lib/medicines/search'
async function main() {
 loadEnvConfig(process.cwd(),false,{info(){},error(){}})
 const db=new Client({...databaseConnection(process.env.DIRECT_URL),connectionTimeoutMillis:10000,query_timeout:20000})
 await db.connect()
 try {
  const doctor=(await db.query('SELECT id FROM "Doctor" WHERE active ORDER BY id LIMIT 1')).rows[0]
  if(!doctor)throw new Error('Active doctor required')
  const counts=(await db.query('SELECT source,system,count(*)::int AS records FROM "Brand" GROUP BY source,system ORDER BY source,system')).rows
  const old=Number((await db.query('SELECT count(*) FROM "Medicine"')).rows[0].count)
  if(old!==267)throw new Error('Legacy count changed; review')
  const tables=['Brand','Composition','BrandComposition','BrandAlias','DoctorMedicinePref']
  for(const table of tables){
   const result=await db.query(`SELECT c.relrowsecurity,has_table_privilege('anon',c.oid,'SELECT') AS anon,has_table_privilege('authenticated',c.oid,'SELECT') AS authenticated FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relname=$1 AND n.nspname='public'`,[table])
   if(result.rows.length!==1 || !result.rows[0].relrowsecurity || result.rows[0].anon || result.rows[0].authenticated)throw new Error('Private table check failed')
  }
  const probes=['ondem','ondem md','ondem 4','uprise','uprise d3','aciloc','aciloc 300','pan 40','dolo 650','azithral','montair lc','ondansetron','alkem']
  const times:number[]=[];const found:{query:string;count:number;top:string}[]=[]
  for(const query of probes){
   for(let i=0;i<12;i++){
    const started=performance.now(),result=await db.query(brandSearchSql,searchArguments(query,doctor.id))
    const duration=performance.now()-started
    if(i>=2)times.push(duration)
    if(!result.rows.length || result.rows.length>20)throw new Error('Required source query failed')
    if(i===0)found.push({query,count:result.rows.length,top:result.rows[0].name})
   }
  }
  times.sort((a,b)=>a-b)
  const p95=times[Math.ceil(times.length*.95)-1]
  const outer=(await db.query('EXPLAIN (ANALYZE, BUFFERS) '+brandSearchSql,searchArguments('ondem md',doctor.id))).rows.map(row=>row['QUERY PLAN']).join('\n')
  const tokenPlan=(await db.query(`EXPLAIN (ANALYZE, BUFFERS) SELECT id FROM "Brand" WHERE to_tsvector('simple',"searchText") @@ plainto_tsquery('simple','ondansetron') LIMIT 600`)).rows.map(row=>row['QUERY PLAN']).join('\n')
  const size=Number((await db.query('SELECT pg_database_size(current_database()) AS bytes')).rows[0].bytes)
  const previous = await readFile('docs/SEARCH_PERF.md', 'utf8')
  await writeFile('docs/SEARCH_PERF.md', previous.split('\n## Hosted real-catalog verification')[0].trimEnd()+'\n')
  await appendFile('docs/SEARCH_PERF.md',[
   '\n## Hosted real-catalog verification\n',`Counts: ${JSON.stringify(counts)}. Legacy Medicine rows retained: ${old}.`,
   `Database bytes: ${size}. Client-to-DB query round-trip p95: ${p95.toFixed(2)} ms over ${times.length} warm samples. Includes local-machine network; excludes Supabase Auth, HTTP routing, debounce and rendering.`,
   'This is not an authenticated HTTP or iPad timing claim. All five new tables have RLS enabled and SELECT denied to both browser roles. No patient rows or clinical records were read.','',
   '| Query | Results (cap 20) | First source presentation |','| --- | --- | --- |',...found.map(row=>`| ${row.query} | ${row.count} | ${row.top.replaceAll('|','/')} |`),'',
   'Application SQL EXPLAIN:', '```text',outer,'```','Token-index EXPLAIN:','```text',tokenPlan,'```','',
  ].join('\n').replaceAll(doctor.id,'<active-doctor>'))
  console.log(JSON.stringify({counts,legacyMedicineRows:old,databaseBytes:size,queryRoundTripP95Ms:Number(p95.toFixed(2)),privateTablesVerified:5,sourceQueriesVerified:found.length}))
 }finally{await db.end()}
}
main().catch(()=>{console.error('Hosted catalog verification failed. Check catalog counts, privacy, query results and connectivity. No raw errors logged.');process.exitCode=1})
