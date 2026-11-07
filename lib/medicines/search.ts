import { normalizeBrandSearch } from './brand-preflight'
import { brandChoice } from './brand'
import type { Brand, DoctorMedicinePref } from '../generated/prisma/client'
export const brandSearchSql = `
 WITH input AS (SELECT $1::text q, $2::text doctor, $3::text system),
 candidates AS (
   SELECT id FROM public.nivaa_brand_candidates($1) WHERE $1 <> ''
   UNION (SELECT p."brandId" FROM public."DoctorMedicinePref" p JOIN public."Brand" b ON b.id=p."brandId"
     WHERE p."doctorId"=$2 AND $1<>'' AND b."searchText" ILIKE '%' || split_part($1,' ',1) || '%'
     ORDER BY p."isFavorite" DESC,p."useCount" DESC LIMIT 100)
   UNION SELECT "brandId" FROM public."DoctorMedicinePref" WHERE "doctorId"=$2 AND $1=''
   UNION (SELECT id FROM public."Brand" WHERE $1='' AND NOT "isDiscontinued" ORDER BY "nameNormalized" LIMIT 20)
 ), ranked AS (
 SELECT b.*, to_jsonb(p) pref,
 CASE WHEN b."nameNormalized"=i.q OR EXISTS(SELECT 1 FROM public."BrandAlias" a WHERE a."brandId"=b.id AND a."aliasNormalized"=i.q) THEN 0
 WHEN b."nameNormalized" LIKE i.q || '%' AND i.q<>'' THEN 1
 WHEN i.q<>'' AND NOT EXISTS (SELECT 1 FROM unnest(string_to_array(i.q,' ')) t WHERE position(t in b."nameNormalized")=0) THEN 2
 WHEN coalesce(p."isFavorite",false) OR coalesce(p."useCount",0)>0 THEN 3
 WHEN public.nivaa_brand_similarity(i.q,b."nameNormalized")>=0.45 THEN 4 ELSE 5 END tier,
 public.nivaa_brand_similarity(i.q,b."nameNormalized") sim,
 coalesce(p."isFavorite",false) favorite, coalesce(p."useCount",0) uses, p."lastUsedAt" used
 FROM candidates c JOIN public."Brand" b ON b.id=c.id CROSS JOIN input i
 LEFT JOIN public."DoctorMedicinePref" p ON p."brandId"=b.id AND p."doctorId"=i.doctor
 WHERE NOT b."isDiscontinued" AND (i.system='ALL' OR b.system::text=i.system)
 AND NOT EXISTS (SELECT 1 FROM unnest(string_to_array(i.q,' ')) t WHERE t ~ '[0-9]' AND NOT (' '||b."nameNormalized"||' ' LIKE '% '||t||' %'))
 AND (i.q='' OR NOT EXISTS (SELECT 1 FROM unnest(string_to_array(i.q,' ')) t WHERE position(t in b."searchText")=0)
   OR public.nivaa_brand_similarity(i.q,b."nameNormalized")>=0.45
   OR EXISTS (SELECT 1 FROM public."BrandAlias" a WHERE a."brandId"=b.id AND a."aliasNormalized" LIKE i.q||'%'))
 ) SELECT * FROM ranked ORDER BY CASE WHEN $1='' THEN 0 ELSE tier END,
 favorite DESC, CASE WHEN $1='' THEN used END DESC NULLS LAST, uses DESC, used DESC NULLS LAST, sim DESC, "nameNormalized", id LIMIT 20`
export function searchArguments(query: string, doctorId: string, system = 'ALL') {
  return [normalizeBrandSearch(query.slice(0, 100)), doctorId, system === 'AYURVEDIC' ? 'AYUSH' : ['ALLOPATHY','AYUSH','OTHER'].includes(system) ? system : 'ALL']
}
export function mapBrandResults(rows: (Brand & { pref: DoctorMedicinePref | null })[]) {
  return rows.map(row => brandChoice(row, row.pref))
}
