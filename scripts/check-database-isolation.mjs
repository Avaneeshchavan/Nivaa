import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'

// Uses Prisma's already-installed local test engine; no remote DB or PHI.
const db = new PGlite()
const sql = name => readFile(new URL(`../prisma/migrations/${name}/migration.sql`, import.meta.url), 'utf8')
const tables = ['Doctor', 'Patient', 'Visit', 'Prescription', 'Medicine', 'DiseaseTemplate', '_prisma_migrations']
try {
  await db.exec(await sql('0_init'))
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated;
    CREATE TABLE "_prisma_migrations" (id text);
    INSERT INTO "Doctor" (id, "supabaseId", email, "updatedAt") VALUES ('doctor-a', 'user-a', 'fixture@example.invalid', now());
    INSERT INTO "Patient" (id, "doctorId", name, "updatedAt") VALUES ('patient-a', 'doctor-a', 'Synthetic fixture', now());
    GRANT USAGE ON SCHEMA public TO anon, authenticated;
    GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
    SET ROLE anon;
  `)
  assert.equal((await db.query('SELECT id FROM "Patient"')).rows.length, 1, 'Reproduce unprotected API access')
  await db.exec('RESET ROLE')
  await db.exec(await sql('202611030003_private_application_tables'))
  for (const role of ['anon', 'authenticated']) {
    await db.exec(`SET ROLE ${role}`)
    for (const table of tables) {
      for (const statement of [`SELECT * FROM "${table}"`, `UPDATE "${table}" SET id = id`, `DELETE FROM "${table}"`, `INSERT INTO "${table}" (id) VALUES ('forbidden')`, `TRUNCATE "${table}"`]) {
        await assert.rejects(db.query(statement), error => error.code === '42501', `${role}: ${table} must deny access`)
      }
    }
    await db.exec('RESET ROLE')
  }
  // Defence in depth: a permissive policy and restored DML grants cannot reopen RLS.
  await db.exec(`
    GRANT SELECT, INSERT, UPDATE, DELETE ON "Patient" TO authenticated;
    CREATE POLICY legacy_open_policy ON "Patient" FOR ALL TO authenticated USING (true) WITH CHECK (true);
    SET ROLE authenticated;
  `)
  assert.equal((await db.query('SELECT * FROM "Patient"')).rows.length, 0)
  assert.equal((await db.query('UPDATE "Patient" SET name = \'forbidden\' RETURNING id')).rows.length, 0)
  assert.equal((await db.query('DELETE FROM "Patient" RETURNING id')).rows.length, 0)
  await assert.rejects(db.query(`INSERT INTO "Patient" (id, "doctorId", name, "updatedAt") VALUES ('bad', 'doctor-a', 'bad', now())`), error => error.code === '42501')
  await db.exec('RESET ROLE')
  assert.equal((await db.query('SELECT name FROM "Patient"')).rows[0].name, 'Synthetic fixture')
  await db.query('UPDATE "Patient" SET "updatedAt" = now()')
  console.log('PASS: API roles denied on all tables; restrictive RLS survives permissive policies; trusted server access retained')
} finally {
  await db.close()
}
