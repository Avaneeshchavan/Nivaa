BEGIN;
SET LOCAL search_path = public, extensions;
-- Additive only. Existing prescriptions and medicines retain their values.
ALTER TABLE public."Medicine" ADD COLUMN "system" TEXT NOT NULL DEFAULT 'ALLOPATHY';
ALTER TABLE public."Medicine" ADD CONSTRAINT "Medicine_system_check" CHECK ("system" IN ('ALLOPATHY', 'AYURVEDIC'));
ALTER TABLE public."Prescription" ADD COLUMN "handwriting" JSONB;
CREATE INDEX "Visit_patientId_date_idx" ON public."Visit" ("patientId", "date" DESC);
CREATE INDEX "Prescription_visitId_createdAt_idx" ON public."Prescription" ("visitId", "createdAt" DESC);
CREATE INDEX "Medicine_name_trgm_idx" ON public."Medicine" USING GIN (name gin_trgm_ops);
CREATE INDEX "Medicine_generic_trgm_idx" ON public."Medicine" USING GIN (generic gin_trgm_ops);
COMMIT;
