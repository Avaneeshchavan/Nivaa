require('tsx/cjs')
const fs=require('node:fs'),assert=require('node:assert/strict'),{performance}=require('node:perf_hooks')
const {PGlite}=require('@electric-sql/pglite'),{pg_trgm}=require('@electric-sql/pglite/contrib/pg_trgm')
const {makeBrand}=require('../lib/medicines/brand.ts'),{insertBrandsSql}=require('../lib/medicines/brand-sql.ts')
const {brandSearchSql,searchArguments}=require('../lib/medicines/search.ts')
const db=new PGlite({extensions:{pg_trgm}})
;(async()=>{
 await db.exec('CREATE EXTENSION pg_trgm; CREATE ROLE anon; CREATE ROLE authenticated;')
 await db.exec(fs.readFileSync('prisma/migrations/0_init/migration.sql','utf8'))
 await db.exec('ALTER TABLE "Medicine" ADD COLUMN system text DEFAULT \'ALLOPATHY\';ALTER TABLE "Medicine" ADD COLUMN manufacturer text;')
 await db.exec(fs.readFileSync('prisma/migrations/202611070006_brand_catalog/migration.sql','utf8'))
 const indexes=(await db.query("SELECT indexname,indexdef FROM pg_indexes WHERE tablename='Brand' AND indexdef LIKE '%USING gin%'")).rows
 for(const item of indexes) await db.exec(`DROP INDEX "${item.indexname}"`)
 const template=makeBrand({source:'SEED_DATASET',sourceId:'0',name:'Synthetic fixture',formText:'tablet',manufacturer:'Fixture company',compositionText:'Synthetic ingredient 10 mg'})
 const roots=['Medi','Care','Aero','Cardio','Gastro','Neuro','Vita','Cure','Relief','Aller']
 for(let start=0;start<250000;start+=2000){
  const rows=Array.from({length:2000},(_,index)=>{const i=start+index,name=`${roots[i%roots.length]} ${i} SR 10 mg tablet`;return{...template,id:`scale_${i}`,sourceId:`scale_${i}`,identityKey:`scale_${i}`,name,nameNormalized:name.toLowerCase(),searchText:`${name.toLowerCase()} fixture company ${i%500} synthetic ingredient 10 mg`}})
  await db.query(insertBrandsSql,[JSON.stringify(rows)])
 }
 const examples=['Ondem MD 4 mg','Uprise D3 injection','Aciloc 300 mg','Pan 40 mg','Dolo 650 mg','Azithral 500 mg','Montair LC']
 const known=examples.map((name,i)=>makeBrand({source:'SEED_DATASET',sourceId:`known${i}`,name,formText:name.includes('injection')?'injection':'tablet',manufacturer:'Alkem fixture',compositionText:i===0?'Ondansetron 4 mg':'Synthetic composition'}))
 await db.query(insertBrandsSql,[JSON.stringify(known)])
 for(const item of indexes) await db.exec(item.indexdef)
 await db.exec('ANALYZE "Brand"; ANALYZE "BrandAlias"; ANALYZE "DoctorMedicinePref";')
 const queries=['ondem','ondem md','ondem 4','uprise','uprise d3','aciloc','aciloc 300','pan 40','dolo 650','azithral','montair lc','ondansetron','alkem','ondam md','medi 1000']
 const timings=[], perQuery=[]
 for(const q of queries) { const values=[];for(let i=0;i<12;i++) {const start=performance.now();const found=await db.query(brandSearchSql,searchArguments(q,'fixture-doctor'));if(i>=2){const ms=performance.now()-start;timings.push(ms);values.push(ms)};assert.ok(found.rows.length<=20)};values.sort((a,b)=>a-b);perQuery.push([q,values[values.length-1]]) }
 timings.sort((a,b)=>a-b)
 console.log(JSON.stringify(perQuery))
 const p95=timings[Math.ceil(timings.length*.95)-1]
 const plan=(await db.query('EXPLAIN (ANALYZE, BUFFERS) '+brandSearchSql,searchArguments('ondem md','fixture-doctor'))).rows.map(row=>row['QUERY PLAN']).join('\n')
 fs.writeFileSync('docs/SEARCH_PERF.md',`# N1 search performance\n\nLocal PostgreSQL-compatible PGlite/WASM scale check; synthetic fixture, never uploaded to clinic DB.\n\nRows: 250,007. Ten synthetic name families, 500 company variants, shared synthetic composition; seven explicitly labeled probe brands. This is not a substitute for the actual source distribution.\n\nSamples: ${timings.length} after two warmups per query. SQL p95: ${p95.toFixed(2)} ms. Target: <150 ms; result: ${p95<150?'PASS':'FAIL'}. Excludes Auth, network, route serialization, typing debounce and browser rendering.\n\nEXPLAIN below executes the exact application SQL. Candidate lookup uses a SQL function with local pg_trgm settings; its internal indexes are not expanded in this outer plan.\n\n\x60\x60\x60text\n${plan}\n\x60\x60\x60\n\nAuthenticated HTTP and physical-iPad measurements remain pending.\n`)
 console.log(`Scale SQL p95 ${p95.toFixed(2)} ms on 250,007 synthetic rows; report docs/SEARCH_PERF.md`)
 assert.ok(p95<150,'Local SQL p95 exceeds 150ms target')
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>db.close())
