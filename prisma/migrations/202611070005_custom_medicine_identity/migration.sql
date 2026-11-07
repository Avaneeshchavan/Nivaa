BEGIN;

ALTER TABLE public."Medicine" ADD COLUMN "manufacturer" TEXT;

-- Presentation identity, not a clinical equivalence rule. Keep decimals, slashes
-- and strengths distinct. Treat only hyphen separators, case and spaces alike.
CREATE FUNCTION public.nivaa_medicine_normalize(value TEXT)
RETURNS TEXT LANGUAGE SQL IMMUTABLE PARALLEL SAFE
SET search_path = pg_catalog
AS $$
  SELECT lower(btrim(regexp_replace(
    translate(normalize(coalesce(value, ''), NFKC), '-‐‑‒–—−', '       '),
    '[[:space:]]+', ' ', 'g')))
$$;

-- Abort safely if a catalog has existing collisions; never delete/merge rows.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public."Medicine"
    GROUP BY public.nivaa_medicine_normalize("name"), public.nivaa_medicine_normalize("form")
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Medicine presentation duplicates require review before migration';
  END IF;
END $$;

CREATE UNIQUE INDEX "Medicine_presentation_identity_key" ON public."Medicine"
  (public.nivaa_medicine_normalize("name"), public.nivaa_medicine_normalize("form"));

COMMIT;
