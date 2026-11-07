require('tsx/cjs')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const { PGlite } = require('@electric-sql/pglite')
const { pg_trgm } = require('@electric-sql/pglite/contrib/pg_trgm')
const { makeBrand } = require('../lib/medicines/brand.ts')
const { insertBrandsSql } = require('../lib/medicines/brand-sql.ts')
const { brandSearchSql, searchArguments } = require('../lib/medicines/search.ts')
const { sourceCompositions } = require('../lib/medicines/compositions.ts')
const db = new PGlite({ extensions: { pg_trgm } })
;(async () => {
 await db.exec('CREATE EXTENSION pg_trgm; CREATE ROLE anon; CREATE ROLE authenticated;')
 await db.exec(fs.readFileSync('prisma/migrations/0_init/migration.sql','utf8'))
 await db.exec(`ALTER TABLE "Medicine" ADD COLUMN system text DEFAULT 'ALLOPATHY'; ALTER TABLE "Medicine" ADD COLUMN manufacturer text;
 INSERT INTO "Medicine" (id,name,form,"updatedAt") VALUES ('old','Legacy fixture','Tablet',now());
 INSERT INTO "Doctor" (id,"supabaseId",email,"updatedAt") VALUES ('a','a','a@example.invalid',now()),('b','b','b@example.invalid',now());`)
 await db.exec(fs.readFileSync('prisma/migrations/202611070006_brand_catalog/migration.sql','utf8'))
 assert.equal((await db.query('SELECT * FROM "Brand" WHERE "legacyMedicineId"=\'old\'')).rows.length,1)
 const names = ['Ondem MD 4 mg','Ondem 4 mg','Ondem 8 mg','Uprise D3 600000 IU/mL','Aciloc 300 mg','Pan 40 mg','Dolo 650 mg','Azithral 500 mg','Montair LC','Cetzine 10 mg']
 const fixtures = names.map((name,index)=>makeBrand({source:'SEED_DATASET',sourceId:String(index),name,formText:index===3?'injection':'tablet',manufacturer:index<4?'Alkem':'Synthetic company',compositionText:name.startsWith('Ondem')?'Ondansetron 4 mg':'Synthetic composition',system:'ALLOPATHY'}))
 for(let i=fixtures.length;i<200;i++) fixtures.push(makeBrand({source:'SEED_DATASET',sourceId:String(i),name:`Synthetic fixture ${i}`,formText:'tablet',system:'ALLOPATHY'}))
 assert.equal((await db.query(insertBrandsSql,[JSON.stringify(fixtures)])).rows.length,200)
 assert.equal((await db.query(insertBrandsSql,[JSON.stringify(fixtures)])).rows.length,0,'idempotent import')
 const search=async(q,doctor='a',system='ALL')=>(await db.query(brandSearchSql,searchArguments(q,doctor,system))).rows
 for(const [q,expected] of [['ondem','Ondem'],['ondem md','Ondem MD'],['ondem 4','Ondem'],['uprise','Uprise'],['uprise d3','Uprise'],['aciloc','Aciloc'],['aciloc 300','Aciloc'],['pan 40','Pan'],['dolo 650','Dolo'],['azithral','Azithral'],['montair lc','Montair'],['ondansetron','Ondem'],['alkem','Ondem']]) {
  const rows=await search(q)
  assert.ok(rows.slice(0,3).some(r=>r.name.startsWith(expected)),`${q} expected top-three ${expected}: ${rows.map(r=>r.name)}`)
  assert.ok(rows.length<=20)
 }
 for(const q of ['ondam md','ondm','azitharl','acilco 300']) assert.ok((await search(q)).length>0,`typo ${q}`)
 for(const row of await search('ondem md')) assert.match(row.name,/MD/,'MD modifier must refine presentations')
 for(const row of await search('ondem 4')) assert.match(row.name,/4/,'numeric strength must refine results even with fuzzy names')
 assert.equal((await search('uprise d3 tablet')).length,0,'explicit tablet query must not return an injection')
 const favorite=fixtures[9]
 await db.query(`INSERT INTO "DoctorMedicinePref" ("doctorId","brandId","useCount","isFavorite","defaultDosage") VALUES ('a',$1,7,true,'Doctor A only')`,[favorite.id])
 assert.equal((await search(''))[0].id,favorite.id)
 assert.equal((await search('', 'b')).some(row=>row.pref?.defaultDosage==='Doctor A only'),false)
 assert.equal((await search('ondem','a','AYURVEDIC')).length,0)
 await db.query('UPDATE "Brand" SET "isDiscontinued"=true WHERE id=$1',[fixtures[0].id])
 assert.equal((await search('ondem')).some(r=>r.id===fixtures[0].id),false)
 for(const role of ['anon','authenticated']) {
  await db.exec(`SET ROLE ${role}`)
  for(const table of ['Brand','Composition','BrandComposition','BrandAlias','DoctorMedicinePref']) await assert.rejects(db.query(`SELECT * FROM "${table}"`),e=>e.code==='42501')
  await db.exec('RESET ROLE')
 }
 assert.equal(require('../lib/medicines/brand.ts').strengthText('Synthetic combo 500 mg + 125 mg oral tablet'),'500 mg + 125 mg')
 const components=sourceCompositions('Paracetamol 500 mg and Caffeine 30 mg oral tablet','Oral tablet')
 assert.equal(components.length,2);assert.equal(components[0].strengthText,'500 mg')
 assert.equal(sourceCompositions('Synthetic (salt and base) 4 mg oral tablet','Oral tablet').length,1)
 const {rxMedicineSchema}=require('../lib/validations/prescription.schema.ts')
 const old={id:'old',name:'Old fixture',dosage:'',frequency:'',duration:''}
 assert.equal(rxMedicineSchema.parse(old).brandId,undefined)
 assert.equal(rxMedicineSchema.parse({...old,brandId:favorite.id,manufacturer:'Snapshot',composition:'Snapshot composition'}).manufacturer,'Snapshot')
 console.log('PASS: 200-row actual SQL ranking, all 13 required queries, typos, private favorites, filters, legacy migration, idempotence, discontinued exclusion, new-table isolation and snapshot compatibility')
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>db.close())
