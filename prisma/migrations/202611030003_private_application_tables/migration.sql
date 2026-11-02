-- Application data is accessed only through authorized server-side Prisma calls.
-- The runtime must use a trusted server role (currently the table owner), never
-- an anon/authenticated API role. RLS does not replace action ownership checks.
DO $$
DECLARE
  table_name text;
  api_role text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'Doctor', 'Patient', 'Visit', 'Prescription', 'Medicine',
    'DiseaseTemplate', '_prisma_migrations'
  ] LOOP
    IF to_regclass(format('public.%I', table_name)) IS NULL THEN
      CONTINUE;
    END IF;
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM PUBLIC', table_name);
    -- Restrictive policies AND with any existing permissive policies. Even an
    -- accidental later API grant must not expose these server-only tables.
    EXECUTE format('CREATE POLICY nivaa_server_only ON public.%I AS RESTRICTIVE FOR ALL TO PUBLIC USING (false) WITH CHECK (false)', table_name);
    FOREACH api_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = api_role) THEN
        EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM %I', table_name, api_role);
      END IF;
    END LOOP;
  END LOOP;
END $$;
