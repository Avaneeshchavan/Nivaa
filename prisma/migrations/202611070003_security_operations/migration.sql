BEGIN;
CREATE TABLE public."AuditLog" (
  id TEXT PRIMARY KEY, "doctorId" TEXT NOT NULL, action TEXT NOT NULL,
  "resourceId" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "AuditLog_doctorId_createdAt_idx" ON public."AuditLog" ("doctorId", "createdAt" DESC);
CREATE TABLE public."RateLimit" (
  key TEXT PRIMARY KEY, attempts INTEGER NOT NULL CHECK (attempts > 0),
  "windowStartedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE public."AuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."RateLimit" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."AuditLog", public."RateLimit" FROM PUBLIC, anon, authenticated;
CREATE POLICY nivaa_server_only ON public."AuditLog" AS RESTRICTIVE FOR ALL TO PUBLIC USING (false) WITH CHECK (false);
CREATE POLICY nivaa_server_only ON public."RateLimit" AS RESTRICTIVE FOR ALL TO PUBLIC USING (false) WITH CHECK (false);
-- Audit rows are append-only even for the application's current trusted connection.
CREATE FUNCTION public.nivaa_preserve_audit() RETURNS trigger LANGUAGE plpgsql
SET search_path = pg_catalog AS $$ BEGIN RAISE EXCEPTION 'Audit events are append-only'; END $$;
CREATE TRIGGER nivaa_audit_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON public."AuditLog"
  FOR EACH STATEMENT EXECUTE FUNCTION public.nivaa_preserve_audit();
COMMIT;
