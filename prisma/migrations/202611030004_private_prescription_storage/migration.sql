-- Revoke public-link metadata without deleting prescriptions or stored files.
UPDATE public."Prescription" SET "pdfUrl" = NULL
WHERE "pdfUrl" LIKE '%/storage/v1/object/public/prescriptions/%';

-- Plain PostgreSQL development/shadow databases do not have Supabase Storage.
-- On Supabase, run as the migration administrator / SQL Editor postgres role.
DO $$
BEGIN
  IF to_regclass('storage.buckets') IS NULL AND to_regclass('storage.objects') IS NULL THEN
    RAISE NOTICE 'Supabase Storage absent; configure the private bucket before deployment';
    RETURN;
  END IF;

  UPDATE storage.buckets SET public = false WHERE id = 'prescriptions';
  ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;
  ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

  -- Old broad permissive policies must not allow API users to make this public.
  CREATE POLICY nivaa_prescription_bucket_guard ON storage.buckets
    AS RESTRICTIVE FOR ALL TO anon, authenticated
    USING (id <> 'prescriptions') WITH CHECK (id <> 'prescriptions');

  -- The Storage API sets owner_id from the JWT. Match it AND the UUID folder.
  -- Legacy CUID folders remain archived but cannot be downloaded by API users;
  -- the app regenerates their PDF through its existing authorized endpoint.
  CREATE POLICY nivaa_prescription_object_guard ON storage.objects
    AS RESTRICTIVE FOR ALL TO anon, authenticated
    USING (bucket_id <> 'prescriptions' OR (
      owner_id = (SELECT auth.uid())::text
      AND split_part(name, '/', 1) = (SELECT auth.uid())::text
    ))
    WITH CHECK (bucket_id <> 'prescriptions' OR (
      owner_id = (SELECT auth.uid())::text
      AND split_part(name, '/', 1) = (SELECT auth.uid())::text
    ));

  CREATE POLICY nivaa_prescription_owner ON storage.objects
    FOR ALL TO authenticated
    USING (bucket_id = 'prescriptions'
      AND owner_id = (SELECT auth.uid())::text
      AND split_part(name, '/', 1) = (SELECT auth.uid())::text)
    WITH CHECK (bucket_id = 'prescriptions'
      AND owner_id = (SELECT auth.uid())::text
      AND split_part(name, '/', 1) = (SELECT auth.uid())::text);
END $$;
