-- Optional measurements: existing visits retain NULL, and no data is dropped.
-- Patient.allergies already exists in the initial schema.
ALTER TABLE "Visit"
  ADD COLUMN "weightKg" DOUBLE PRECISION,
  ADD COLUMN "bloodPressure" TEXT,
  ADD COLUMN "temperatureC" DOUBLE PRECISION,
  ADD COLUMN "spo2" INTEGER;
