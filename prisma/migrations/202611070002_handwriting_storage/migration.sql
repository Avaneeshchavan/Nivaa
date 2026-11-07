DO $$
BEGIN
  IF to_regclass('storage.buckets') IS NULL THEN RETURN; END IF;
  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES ('prescription-notes', 'prescription-notes', false, 750000, ARRAY['image/jpeg'])
    ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = 750000, allowed_mime_types = ARRAY['image/jpeg'];
  CREATE POLICY nivaa_notes_bucket_guard ON storage.buckets AS RESTRICTIVE FOR ALL TO anon, authenticated
    USING (id <> 'prescription-notes') WITH CHECK (id <> 'prescription-notes');
  CREATE POLICY nivaa_notes_object_guard ON storage.objects AS RESTRICTIVE FOR ALL TO anon, authenticated
    USING (bucket_id <> 'prescription-notes' OR (owner_id = (SELECT auth.uid())::text AND split_part(name, '/', 1) = (SELECT auth.uid())::text))
    WITH CHECK (bucket_id <> 'prescription-notes' OR (owner_id = (SELECT auth.uid())::text AND split_part(name, '/', 1) = (SELECT auth.uid())::text));
  CREATE POLICY nivaa_notes_owner ON storage.objects FOR ALL TO authenticated
    USING (bucket_id = 'prescription-notes' AND owner_id = (SELECT auth.uid())::text AND split_part(name, '/', 1) = (SELECT auth.uid())::text)
    WITH CHECK (bucket_id = 'prescription-notes' AND owner_id = (SELECT auth.uid())::text AND split_part(name, '/', 1) = (SELECT auth.uid())::text);
END $$;
