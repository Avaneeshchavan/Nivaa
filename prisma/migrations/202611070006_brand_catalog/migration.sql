BEGIN;
SET LOCAL search_path = public, extensions, pg_catalog;
-- CreateEnum
CREATE TYPE "BrandSystem" AS ENUM ('ALLOPATHY', 'AYUSH', 'OTHER');

-- CreateEnum
CREATE TYPE "BrandSource" AS ENUM ('SEED_CDCI', 'SEED_DATASET', 'DOCTOR_ADDED', 'LEGACY');

-- CreateEnum
CREATE TYPE "MedicineForm" AS ENUM ('TABLET', 'CAPSULE', 'SYRUP', 'SUSPENSION', 'DROPS', 'INJECTION', 'OINTMENT', 'CREAM', 'GEL', 'INHALER', 'POWDER', 'SACHET', 'OTHER');

-- CreateEnum
CREATE TYPE "MedicineFood" AS ENUM ('BEFORE', 'AFTER', 'WITH', 'ANY');

-- CreateTable
CREATE TABLE "Brand" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameNormalized" TEXT NOT NULL,
    "form" "MedicineForm" NOT NULL,
    "formText" TEXT NOT NULL,
    "strengthText" TEXT,
    "manufacturer" TEXT,
    "packSize" TEXT,
    "system" "BrandSystem" NOT NULL DEFAULT 'OTHER',
    "isDiscontinued" BOOLEAN NOT NULL DEFAULT false,
    "discontinuedKnown" BOOLEAN NOT NULL DEFAULT false,
    "source" "BrandSource" NOT NULL,
    "sourceId" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdByDoctorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "compositionText" TEXT NOT NULL DEFAULT '',
    "searchText" TEXT NOT NULL,
    "identityKey" TEXT NOT NULL,
    "legacyMedicineId" TEXT,

    CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Composition" (
    "id" TEXT NOT NULL,
    "genericName" TEXT NOT NULL,
    "strengthText" TEXT NOT NULL,

    CONSTRAINT "Composition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandComposition" (
    "brandId" TEXT NOT NULL,
    "compositionId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "BrandComposition_pkey" PRIMARY KEY ("brandId","order")
);

-- CreateTable
CREATE TABLE "BrandAlias" (
    "brandId" TEXT NOT NULL,
    "alias" TEXT NOT NULL,
    "aliasNormalized" TEXT NOT NULL,

    CONSTRAINT "BrandAlias_pkey" PRIMARY KEY ("brandId","aliasNormalized")
);

-- CreateTable
CREATE TABLE "DoctorMedicinePref" (
    "doctorId" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "useCount" INTEGER NOT NULL DEFAULT 0,
    "lastUsedAt" TIMESTAMP(3),
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "defaultPattern" TEXT,
    "defaultFood" "MedicineFood",
    "defaultDurationDays" INTEGER,
    "defaultInstruction" TEXT,
    "defaultDosage" TEXT,
    "defaultFrequency" TEXT,
    "defaultDuration" TEXT,

    CONSTRAINT "DoctorMedicinePref_pkey" PRIMARY KEY ("doctorId","brandId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Brand_identityKey_key" ON "Brand"("identityKey");

-- CreateIndex
CREATE UNIQUE INDEX "Brand_legacyMedicineId_key" ON "Brand"("legacyMedicineId");

-- CreateIndex
CREATE INDEX "Brand_name_prefix_idx" ON "Brand"("nameNormalized" text_pattern_ops);

-- CreateIndex
CREATE INDEX "Brand_name_trgm_idx" ON "Brand" USING GIN ("nameNormalized" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "Brand_searchText_idx" ON "Brand" USING GIN ("searchText" gin_trgm_ops);

-- CreateIndex
CREATE UNIQUE INDEX "Brand_source_sourceId_key" ON "Brand"("source", "sourceId");

-- CreateIndex
CREATE INDEX "BrandComposition_compositionId_idx" ON "BrandComposition"("compositionId");

-- CreateIndex
CREATE INDEX "BrandAlias_aliasNormalized_idx" ON "BrandAlias" USING GIN ("aliasNormalized" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "DoctorMedicinePref_doctorId_isFavorite_lastUsedAt_idx" ON "DoctorMedicinePref"("doctorId", "isFavorite", "lastUsedAt" DESC);

-- AddForeignKey
ALTER TABLE "BrandComposition" ADD CONSTRAINT "BrandComposition_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandComposition" ADD CONSTRAINT "BrandComposition_compositionId_fkey" FOREIGN KEY ("compositionId") REFERENCES "Composition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandAlias" ADD CONSTRAINT "BrandAlias_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorMedicinePref" ADD CONSTRAINT "DoctorMedicinePref_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorMedicinePref" ADD CONSTRAINT "DoctorMedicinePref_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Preserve old catalog IDs and data; Rx JSON remains untouched.
INSERT INTO "Brand" (id,name,"nameNormalized",form,"formText",manufacturer,system,source,"sourceId","compositionText","searchText","identityKey","legacyMedicineId")
SELECT 'legacy_' || id,name,lower(btrim(regexp_replace(normalize(name,NFKC),'[^[:alnum:]]+',' ','g'))),
 CASE WHEN lower(coalesce(form,'')) LIKE '%tablet%' THEN 'TABLET'::"MedicineForm"
      WHEN lower(coalesce(form,'')) LIKE '%capsule%' THEN 'CAPSULE'::"MedicineForm" ELSE 'OTHER'::"MedicineForm" END,
 coalesce(form,''),manufacturer,CASE WHEN system='AYURVEDIC' THEN 'AYUSH'::"BrandSystem" ELSE 'ALLOPATHY'::"BrandSystem" END,
 'LEGACY',id,coalesce(generic,''),lower(btrim(regexp_replace(normalize(concat_ws(' ',name,generic,manufacturer),NFKC),'[^[:alnum:]]+',' ','g'))), 'legacy:'||id,id
FROM "Medicine";

-- The new catalog and preferences follow existing server-only admission.
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['Brand','Composition','BrandComposition','BrandAlias','DoctorMedicinePref'] LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon, authenticated',t);
  EXECUTE format('CREATE POLICY server_only ON public.%I AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false)',t);
 END LOOP;
END $$;
CREATE INDEX "Brand_search_tokens_idx" ON public."Brand" USING GIN (to_tsvector('simple',"searchText"));
CREATE FUNCTION public.nivaa_brand_candidates(q text) RETURNS TABLE(id text)
LANGUAGE plpgsql STABLE
SET search_path = pg_catalog, public, extensions
SET pg_trgm.similarity_threshold = '0.18'
SET pg_trgm.word_similarity_threshold = '0.45'
AS $$
DECLARE numbers text; direct_match boolean;
BEGIN
 SELECT coalesce(string_agg(t,' '),'') INTO numbers FROM unnest(string_to_array(q,' ')) t WHERE t ~ '[0-9]';
 EXECUTE $probe$ SELECT EXISTS(
 (SELECT 1 FROM public."Brand" WHERE "nameNormalized" LIKE $1 || '%' LIMIT 1)
 UNION (SELECT 1 FROM public."Brand" WHERE to_tsvector('simple',"searchText") @@ plainto_tsquery('simple',$1) LIMIT 1)
 UNION (SELECT 1 FROM public."BrandAlias" WHERE "aliasNormalized" LIKE $1 || '%' LIMIT 1))
 $probe$ INTO direct_match USING q;
 -- Use fuzzy names as a fallback, so an existing exact/company result is not
 -- flooded by thousands of similarly spelled unrelated products.
 -- Bound parameters and a custom plan make token/index selectivity visible.
 RETURN QUERY EXECUTE $query$
 (SELECT b.id FROM public."Brand" b WHERE b."nameNormalized" LIKE $1 || '%' LIMIT 200)
 UNION (SELECT b.id FROM public."Brand" b WHERE to_tsvector('simple',b."searchText") @@ plainto_tsquery('simple',$1) LIMIT 600)
 UNION (SELECT b.id FROM public."Brand" b WHERE b."searchText" ILIKE '%' || split_part($1,' ',1) || '%' AND ($2='' OR to_tsvector('simple',b."searchText") @@ plainto_tsquery('simple',$2)) LIMIT 200)
 UNION (SELECT a."brandId" FROM public."BrandAlias" a WHERE a."aliasNormalized" LIKE $1 || '%' LIMIT 200)
 UNION (SELECT b.id FROM public."Brand" b WHERE NOT $3 AND (b."nameNormalized" % $1 OR b."nameNormalized" %> $1)
  AND ($2='' OR to_tsvector('simple',b."searchText") @@ plainto_tsquery('simple',$2))
  ORDER BY word_similarity($1,b."nameNormalized") DESC LIMIT 200)
 $query$ USING q,numbers,direct_match;
END $$;
CREATE FUNCTION public.nivaa_brand_similarity(q text, n text) RETURNS real
LANGUAGE sql IMMUTABLE PARALLEL SAFE SET search_path = pg_catalog, public, extensions
AS $$ SELECT word_similarity(q,n) $$;

COMMIT;
