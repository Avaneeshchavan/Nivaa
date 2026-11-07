import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {PGlite} from '@electric-sql/pglite'
const db=new PGlite()
try {
 await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated;
 CREATE TYPE "MedicineFood" AS ENUM ('BEFORE','AFTER','WITH','ANY');
 CREATE TABLE "Doctor" (id text PRIMARY KEY);
 CREATE TABLE "Prescription" (id text PRIMARY KEY,notes text);
 CREATE TABLE "DoctorMedicinePref" (id text PRIMARY KEY);
 CREATE TABLE "DiseaseTemplate" (id text PRIMARY KEY);
 INSERT INTO "Doctor" VALUES ('a'),('b'); INSERT INTO "Prescription" VALUES ('rx','Synthetic retained');`)
 await db.exec(readFileSync('prisma/migrations/202611070007_rx_workflow/migration.sql','utf8'))
 assert.equal((await db.query('SELECT count(*)::int n FROM "AdviceSnippet"')).rows[0].n,120)
 assert.equal((await db.query('SELECT notes,"followUpDate" FROM "Prescription"')).rows[0].notes,'Synthetic retained')
 assert.equal((await db.query('SELECT "followUpDate" FROM "Prescription"')).rows[0].followUpDate,null)
 for(const role of ['anon','authenticated']) {
  await db.exec(`SET ROLE ${role}`)
  for(const table of ['AdviceSnippet','TemplatePreference'])for(const statement of [`SELECT * FROM "${table}"`,`DELETE FROM "${table}"`,`TRUNCATE "${table}"`])await assert.rejects(db.query(statement),e=>e.code==='42501')
  await db.exec('RESET ROLE')
 }
 await db.exec(`GRANT SELECT,UPDATE,DELETE,INSERT ON "AdviceSnippet" TO authenticated;CREATE POLICY legacy_open ON "AdviceSnippet" FOR ALL TO authenticated USING(true) WITH CHECK(true);SET ROLE authenticated;`)
 assert.equal((await db.query('SELECT * FROM "AdviceSnippet"')).rows.length,0)
 await assert.rejects(db.query(`INSERT INTO "AdviceSnippet" VALUES ('bad','a','EN','bad',now(),now())`),e=>e.code==='42501')
 console.log('PASS: additive SQL preserves existing Rx, seeds 20 snippets/language/doctor, API roles denied and restrictive RLS survives permissive policies')
}finally{await db.close()}
