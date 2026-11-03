import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'
const db = new PGlite()
const migrate = async name => db.exec(await readFile(new URL(`../prisma/migrations/${name}/migration.sql`, import.meta.url), 'utf8'))
const a = '11111111-1111-4111-8111-111111111111'
const b = '22222222-2222-4222-8222-222222222222'
try {
  await migrate('0_init')
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated;
    CREATE SCHEMA auth; CREATE SCHEMA storage;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    CREATE TABLE storage.buckets (id text PRIMARY KEY, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
    CREATE TABLE storage.objects (id text PRIMARY KEY, bucket_id text REFERENCES storage.buckets(id), name text, owner_id text);
    GRANT USAGE ON SCHEMA auth, storage, public TO anon, authenticated;
    GRANT ALL ON ALL TABLES IN SCHEMA storage TO anon, authenticated;
    CREATE POLICY legacy_objects ON storage.objects FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
    CREATE POLICY legacy_buckets ON storage.buckets FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
  `)
  for (const name of ['202611030003_private_application_tables', '202611030004_private_prescription_storage', '202611030005_signature_storage', '202611030006_rx_drafts', '202611030007_storage_delivery']) await migrate(name)
  const flags = (await db.query('SELECT id, public FROM storage.buckets ORDER BY id')).rows
  assert.deepEqual(flags, [{ id: 'logos', public: true }, { id: 'prescriptions', public: false }, { id: 'signatures', public: false }])
  for (const bucket of ['logos', 'prescriptions', 'signatures']) {
    for (const uid of [a,b]) {
      const name = bucket === 'signatures' ? 'signature.png' : bucket === 'logos' ? 'logo.png' : 'fixture.pdf'
      await db.query('INSERT INTO storage.objects VALUES ($1,$2,$3,$4)', [`${bucket}-${uid}`, bucket, `${uid}/${name}`, uid])
    }
  }
  for (const [role, uid] of [['anon', ''], ['authenticated', a], ['authenticated', b]]) {
    await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [uid])
    await db.exec(`SET ROLE ${role}`)
    const objects = (await db.query('SELECT owner_id FROM storage.objects')).rows
    assert.equal(objects.length, uid ? 3 : 0)
    assert.ok(objects.every(row => row.owner_id === uid))
    assert.equal((await db.query('UPDATE storage.buckets SET public=true RETURNING id')).rows.length, 0)
    const other = uid === a ? b : a
    assert.equal((await db.query('DELETE FROM storage.objects WHERE owner_id=$1 RETURNING id', [other])).rows.length, 0)
    for (const bucket of ['logos', 'prescriptions', 'signatures']) {
      await assert.rejects(db.query('INSERT INTO storage.objects VALUES ($1,$2,$3,$4)', ['bad', bucket, `${other}/signature.png`, uid || null]), error => error.code === '42501')
    }
    for (const table of ['Doctor', 'Patient', 'Visit', 'Prescription', 'DiseaseTemplate', 'Medicine', 'RxDraft']) await assert.rejects(db.query(`SELECT * FROM "${table}"`), error => error.code === '42501')
    await db.exec('RESET ROLE')
  }
  console.log('PASS: all storage migrations compose; private Rx/signatures, owner-only writes, logo branding and server-only app tables')
} finally { await db.close() }
