require('tsx/cjs')
const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript')
const { PGlite } = require('@electric-sql/pglite'), { pg_trgm } = require('@electric-sql/pglite/contrib/pg_trgm')
const db = new PGlite({extensions:{pg_trgm}})
let doctor = {id:'a'}, fail=false
const prisma = {
 $queryRawUnsafe:async(sql,...values)=>(await db.query(sql,values)).rows,
 brand:{
  findFirst:async({where})=>(await db.query(`SELECT * FROM "Brand" WHERE "nameNormalized"=$1 AND (lower("formText")=lower($2) OR form=$3::"MedicineForm") AND NOT "isDiscontinued" ORDER BY id LIMIT 1`,[where.nameNormalized,where.OR[0].formText.equals,where.OR[1].form])).rows[0] || null,
  findUniqueOrThrow:async({where})=>(await db.query('SELECT * FROM "Brand" WHERE id=$1',[where.id])).rows[0],
 },
 composition:{upsert:async({create})=>{await db.query('INSERT INTO "Composition" (id,"genericName","strengthText") VALUES ($1,$2,$3) ON CONFLICT DO NOTHING',[create.id,create.genericName,create.strengthText])}},
 brandComposition:{upsert:async({create})=>{await db.query('INSERT INTO "BrandComposition" ("brandId","compositionId","order") VALUES ($1,$2,$3) ON CONFLICT DO NOTHING',[create.brandId,create.compositionId,create.order])}},
 doctorMedicinePref:{upsert:async({where})=>{
  if(fail)throw new Error('Synthetic private failure')
  const {doctorId,brandId}=where.doctorId_brandId
  await db.query(`INSERT INTO "DoctorMedicinePref" ("doctorId","brandId","isFavorite") VALUES ($1,$2,true) ON CONFLICT ("doctorId","brandId") DO UPDATE SET "isFavorite"=true`,[doctorId,brandId])
  return (await db.query('SELECT * FROM \"DoctorMedicinePref\" WHERE \"doctorId\"=$1 AND \"brandId\"=$2',[doctorId,brandId])).rows[0]
 }}
}
let queue=Promise.resolve()
prisma.$transaction=fn=>{
 const result=queue.then(async()=>{await db.exec('BEGIN');try{const r=await fn(prisma);await db.exec('COMMIT');return r}catch(e){await db.exec('ROLLBACK');throw e}})
 queue=result.catch(()=>{});return result
}
const actions={}
vm.runInNewContext(ts.transpileModule(fs.readFileSync('actions/medicines.actions.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports:actions,crypto,require:name=>name==='@/lib/prisma'?{default:prisma}:name==='./auth.actions'?{getCurrentDoctor:async()=>doctor}:require(name)})
;(async()=>{
 await db.exec('CREATE EXTENSION pg_trgm; CREATE ROLE anon; CREATE ROLE authenticated;')
 await db.exec(fs.readFileSync('prisma/migrations/0_init/migration.sql','utf8'))
 await db.exec(`ALTER TABLE "Medicine" ADD COLUMN system text DEFAULT 'ALLOPATHY';ALTER TABLE "Medicine" ADD COLUMN manufacturer text;
 INSERT INTO "Medicine" (id,name,form,"updatedAt") VALUES ('old','Legacy fixture 4 mg','Tablet',now());
 INSERT INTO "Doctor" (id,"supabaseId",email,"updatedAt") VALUES ('a','a','a@example.invalid',now()),('b','b','b@example.invalid',now());`)
 await db.exec(fs.readFileSync('prisma/migrations/202611070006_brand_catalog/migration.sql','utf8'))
 const create=actions.createCustomMedicine
 const input={name:'  Synthetic   brand ',strength:' 4   mg ',form:'tablet',manufacturer:' Fixture   company ',generic:' Synthetic composition '}
 const first=await create(input)
 assert.equal(first.alreadyExists,false);assert.equal(first.medicine.isFavorite,true);assert.equal(first.medicine.name,'Synthetic brand 4 mg');assert.equal(first.medicine.manufacturer,'Fixture company')
 for(const name of ['synthetic brand','SYNTHETIC-BRAND','Ｓｙｎｔｈｅｔｉｃ brand','Synthetic—brand']){
  const duplicate=await create({...input,name,manufacturer:'Must not overwrite'})
  assert.equal(duplicate.alreadyExists,true);assert.equal(duplicate.medicine.id,first.medicine.id);assert.equal(duplicate.medicine.manufacturer,'Fixture company')
 }
 assert.equal((await create({name:'legacy fixture',strength:'4 mg',form:'tablet'})).alreadyExists,true)
 const parallel=await Promise.all(Array.from({length:5},()=>create({name:'Concurrent fixture',form:'other',system:'AYURVEDIC'})))
 assert.equal(new Set(parallel.map(r=>r.medicine.id)).size,1)
 assert.equal(parallel.filter(r=>!r.alreadyExists).length,1)
 doctor={id:'b'};await create(input)
 const prefs=(await db.query('SELECT * FROM "DoctorMedicinePref" WHERE "brandId"=$1',[first.medicine.id])).rows
 assert.equal(prefs.length,2);assert.ok(prefs.every(p=>p.isFavorite))
 fail=true
 const before=(await db.query('SELECT count(*) FROM "Brand"')).rows[0].count
 await assert.rejects(create({...input,name:'Rollback fixture'}),e=>e.message==='Could not save the medicine. Try again.'&&!e.cause)
 assert.equal((await db.query('SELECT count(*) FROM "Brand"')).rows[0].count,before)
 fail=false
 await assert.rejects(create({...input,name:' '}),/Check the medicine/)
 await assert.rejects(create({...input,name:'x'.repeat(160),strength:'x'.repeat(80)}),/Check the medicine/)
 doctor=null;await assert.rejects(create(input),/Unauthorized/)
 console.log('PASS: real custom-brand action SQL, normalized and legacy duplicates, concurrent creation, source metadata, doctor-scoped favorites, rollback, validation and anonymous denial')
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>db.close())
