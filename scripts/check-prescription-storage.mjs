import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'

const db = new PGlite()
const migration = await readFile(new URL('../prisma/migrations/202611030004_private_prescription_storage/migration.sql', import.meta.url), 'utf8')
const a = '11111111-1111-4111-8111-111111111111'
const b = '22222222-2222-4222-8222-222222222222'
try {
  // Minimal Supabase security schema; fixtures only, never remote Storage.
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated;
    CREATE SCHEMA auth; CREATE SCHEMA storage;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
      $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    CREATE TABLE public."Prescription" (id text, "pdfUrl" text);
    INSERT INTO public."Prescription" VALUES ('rx-a', 'https://example.invalid/storage/v1/object/public/prescriptions/legacy/rx-a.pdf');
    CREATE TABLE storage.buckets (id text PRIMARY KEY, public boolean);
    CREATE TABLE storage.objects (id text PRIMARY KEY, bucket_id text, name text, owner_id text);
    INSERT INTO storage.buckets VALUES ('prescriptions', true), ('logos', true);
    INSERT INTO storage.objects VALUES
      ('a', 'prescriptions', '${a}/a.pdf', '${a}'),
      ('b', 'prescriptions', '${b}/b.pdf', '${b}'),
      ('legacy', 'prescriptions', 'doctor-cuid/legacy.pdf', '${a}'),
      ('unowned', 'prescriptions', '${a}/unowned.pdf', NULL),
      ('logo', 'logos', 'branding.png', NULL);
    GRANT USAGE ON SCHEMA auth, storage TO anon, authenticated;
    GRANT ALL ON ALL TABLES IN SCHEMA storage TO anon, authenticated;
    CREATE POLICY old_open_objects ON storage.objects FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
    CREATE POLICY old_open_buckets ON storage.buckets FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
  `)
  await db.exec(migration)
  assert.equal((await db.query(`SELECT public FROM storage.buckets WHERE id='prescriptions'`)).rows[0].public, false)
  assert.equal((await db.query('SELECT "pdfUrl" FROM public."Prescription"')).rows[0].pdfUrl, null)
  for (const [role, uid, visible] of [['anon', '', []], ['authenticated', a, ['a']], ['authenticated', b, ['b']]]) {
    await db.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [uid])
    await db.exec(`SET ROLE ${role}`)
    assert.deepEqual((await db.query("SELECT id FROM storage.objects WHERE bucket_id='prescriptions' ORDER BY id")).rows.map(r => r.id), visible)
    assert.equal((await db.query("UPDATE storage.buckets SET public=true WHERE id='prescriptions' RETURNING id")).rows.length, 0)
    assert.equal((await db.query("SELECT id FROM storage.objects WHERE bucket_id='logos'")).rows.length, 1, 'Other bucket policies unchanged')
    await assert.rejects(db.query("INSERT INTO storage.objects VALUES ('bad', 'prescriptions', $1, $2)", [`${a}/bad.pdf`, b]), e => e.code === '42501')
    const other = uid === a ? 'b' : 'a'
    assert.equal((await db.query('UPDATE storage.objects SET name=name WHERE id=$1 RETURNING id', [other])).rows.length, 0)
    assert.equal((await db.query('DELETE FROM storage.objects WHERE id=$1 RETURNING id', [other])).rows.length, 0)
    if (uid) {
      await db.query("INSERT INTO storage.objects VALUES ($1, 'prescriptions', $2, $3)", [`new-${uid}`, `${uid}/new.pdf`, uid])
      await db.query('UPDATE storage.objects SET name=$1 WHERE id=$2', [`${uid}/updated.pdf`, `new-${uid}`])
      await assert.rejects(db.query('UPDATE storage.objects SET name=$1 WHERE id=$2', [`${uid === a ? b : a}/stolen.pdf`, `new-${uid}`]), e => e.code === '42501')
      await db.query('DELETE FROM storage.objects WHERE id=$1', [`new-${uid}`])
    }
    await db.exec('RESET ROLE')
  }
  assert.equal((await db.query('SELECT count(*)::int AS count FROM storage.objects')).rows[0].count, 5, 'Existing files preserved')
  console.log('PASS: private bucket; anonymous/cross-owner reads and writes denied despite broad policies; own access retained; legacy files quarantined')
} finally { await db.close() }
