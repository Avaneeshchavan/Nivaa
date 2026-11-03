CREATE TABLE public."RxDraft" (
  "id" TEXT PRIMARY KEY, "doctorId" TEXT NOT NULL REFERENCES public."Doctor"("id"),
  "key" TEXT NOT NULL, "payload" JSONB NOT NULL, "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "RxDraft_doctorId_key_key" ON public."RxDraft" ("doctorId", "key");
ALTER TABLE public."RxDraft" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."RxDraft" FROM PUBLIC;
CREATE POLICY nivaa_server_only ON public."RxDraft" AS RESTRICTIVE FOR ALL TO PUBLIC USING (false) WITH CHECK (false);
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN REVOKE ALL ON public."RxDraft" FROM anon; END IF;
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN REVOKE ALL ON public."RxDraft" FROM authenticated; END IF;
END $$;
