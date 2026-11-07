// Static SQL only. All catalog values are carried in one bound JSON parameter.
export const insertBrandsSql = `INSERT INTO public."Brand"
 (id,name,"nameNormalized",form,"formText","strengthText",manufacturer,"packSize",system,"isDiscontinued","discontinuedKnown",source,"sourceId",verified,"createdByDoctorId","compositionText","searchText","identityKey")
 SELECT id,name,"nameNormalized",form::public."MedicineForm","formText","strengthText",manufacturer,"packSize",system::public."BrandSystem",coalesce("isDiscontinued",false),coalesce("discontinuedKnown",false),source::public."BrandSource","sourceId",false,"createdByDoctorId","compositionText","searchText","identityKey"
 FROM jsonb_to_recordset($1::jsonb) AS x(id text,name text,"nameNormalized" text,form text,"formText" text,"strengthText" text,manufacturer text,"packSize" text,system text,"isDiscontinued" boolean,"discontinuedKnown" boolean,source text,"sourceId" text,"createdByDoctorId" text,"compositionText" text,"searchText" text,"identityKey" text)
 ON CONFLICT DO NOTHING RETURNING id`
