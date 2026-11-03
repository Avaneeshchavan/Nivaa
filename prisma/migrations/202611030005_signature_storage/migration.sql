DO $$
BEGIN
  IF to_regclass('storage.buckets') IS NULL THEN RETURN; END IF;
  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES ('signatures', 'signatures', false, 1048576, ARRAY['image/png','image/jpeg'])
    ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = 1048576,
      allowed_mime_types = ARRAY['image/png','image/jpeg'];
  CREATE POLICY nivaa_signature_bucket_guard ON storage.buckets AS RESTRICTIVE
    FOR ALL TO anon, authenticated USING (id <> 'signatures') WITH CHECK (id <> 'signatures');
  CREATE POLICY nivaa_signature_guard ON storage.objects AS RESTRICTIVE FOR ALL TO anon, authenticated
    USING (bucket_id <> 'signatures' OR (owner_id = (SELECT auth.uid())::text AND name = (SELECT auth.uid())::text || '/signature.png'))
    WITH CHECK (bucket_id <> 'signatures' OR (owner_id = (SELECT auth.uid())::text AND name = (SELECT auth.uid())::text || '/signature.png'));
  CREATE POLICY nivaa_signature_owner ON storage.objects FOR ALL TO authenticated
    USING (bucket_id = 'signatures' AND owner_id = (SELECT auth.uid())::text AND name = (SELECT auth.uid())::text || '/signature.png')
    WITH CHECK (bucket_id = 'signatures' AND owner_id = (SELECT auth.uid())::text AND name = (SELECT auth.uid())::text || '/signature.png');
END $$;
