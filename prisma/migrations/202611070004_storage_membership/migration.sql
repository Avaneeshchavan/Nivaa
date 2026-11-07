BEGIN;
ALTER TABLE public."Doctor" ADD COLUMN active BOOLEAN NOT NULL DEFAULT true;
DO $$ BEGIN
  IF to_regclass('auth.users') IS NULL OR to_regclass('storage.objects') IS NULL THEN RETURN; END IF;
  CREATE FUNCTION public.nivaa_storage_doctor() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path = pg_catalog AS $function$
      SELECT EXISTS (
        SELECT 1 FROM public."Doctor" d JOIN auth.users u ON u.id::text = d."supabaseId"
        WHERE u.id = (SELECT auth.uid()) AND d.active AND u.email_confirmed_at IS NOT NULL
          AND lower(d.email) = lower(u.email) AND (u.banned_until IS NULL OR u.banned_until <= now())
      )
    $function$;
  REVOKE ALL ON FUNCTION public.nivaa_storage_doctor() FROM PUBLIC;
  GRANT EXECUTE ON FUNCTION public.nivaa_storage_doctor() TO authenticated;
  CREATE POLICY nivaa_active_storage_doctor ON storage.objects AS RESTRICTIVE FOR ALL TO authenticated
    USING (bucket_id NOT IN ('prescriptions','prescription-notes','signatures','logos') OR (SELECT public.nivaa_storage_doctor()))
    WITH CHECK (bucket_id NOT IN ('prescriptions','prescription-notes','signatures','logos') OR (SELECT public.nivaa_storage_doctor()));
END $$;
COMMIT;
