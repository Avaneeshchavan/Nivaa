-- Application tables (including RxDraft) are already RLS/server-only in prior migrations.
DO $$
BEGIN
  IF to_regclass('storage.buckets') IS NULL THEN RETURN; END IF;
  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES ('prescriptions', 'prescriptions', false, 10485760, ARRAY['application/pdf'])
    ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = 10485760,
      allowed_mime_types = ARRAY['application/pdf'];
  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES ('logos', 'logos', true, 1048576, ARRAY['image/png','image/jpeg'])
    ON CONFLICT (id) DO UPDATE SET file_size_limit = 1048576,
      allowed_mime_types = ARRAY['image/png','image/jpeg'];
  -- Branding can be publicly displayed, but cannot be altered by another user.
  CREATE POLICY nivaa_logo_bucket_guard ON storage.buckets AS RESTRICTIVE
    FOR ALL TO anon, authenticated USING (id <> 'logos') WITH CHECK (id <> 'logos');
  CREATE POLICY nivaa_logo_object_guard ON storage.objects AS RESTRICTIVE FOR ALL TO anon, authenticated
    USING (bucket_id <> 'logos' OR (owner_id = (SELECT auth.uid())::text AND split_part(name, '/', 1) = (SELECT auth.uid())::text))
    WITH CHECK (bucket_id <> 'logos' OR (owner_id = (SELECT auth.uid())::text AND split_part(name, '/', 1) = (SELECT auth.uid())::text));
  CREATE POLICY nivaa_logo_owner ON storage.objects FOR ALL TO authenticated
    USING (bucket_id = 'logos' AND owner_id = (SELECT auth.uid())::text AND split_part(name, '/', 1) = (SELECT auth.uid())::text)
    WITH CHECK (bucket_id = 'logos' AND owner_id = (SELECT auth.uid())::text AND split_part(name, '/', 1) = (SELECT auth.uid())::text);
END $$;
