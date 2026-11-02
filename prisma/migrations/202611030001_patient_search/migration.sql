SET search_path = public, extensions;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX "Patient_name_trgm_idx" ON "Patient" USING GIN ("name" gin_trgm_ops);
CREATE INDEX "Patient_phone_trgm_idx" ON "Patient" USING GIN ("phone" gin_trgm_ops);
CREATE INDEX "Visit_diagnosis_trgm_idx" ON "Visit" USING GIN ("diagnosis" gin_trgm_ops);
CREATE INDEX "Prescription_diagnosis_trgm_idx" ON "Prescription" USING GIN ("diagnosis" gin_trgm_ops);
-- JSON expression indexes are maintained in SQL: Prisma cannot represent them.
CREATE INDEX "Prescription_medicine_names_trgm_idx" ON "Prescription" USING GIN ((jsonb_path_query_array("medicines", '$[*].name')::text) gin_trgm_ops);
CREATE INDEX "Patient_doctor_phone_normalized_idx" ON "Patient" ("doctorId", (regexp_replace(coalesce("phone", ''), '[^0-9]', '', 'g')));
CREATE INDEX "Patient_doctorId_updatedAt_idx" ON "Patient" ("doctorId", "updatedAt" DESC);
CREATE INDEX "Visit_doctorId_patientId_idx" ON "Visit" ("doctorId", "patientId");
CREATE INDEX "Prescription_doctorId_patientId_idx" ON "Prescription" ("doctorId", "patientId");

-- Supabase may already have pg_trgm installed in extensions rather than public.
CREATE FUNCTION public.nivaa_patient_name_similarity(text, text) RETURNS real
LANGUAGE sql IMMUTABLE PARALLEL SAFE
SET search_path = pg_catalog, public, extensions
AS $$ SELECT similarity($1, $2) $$;
