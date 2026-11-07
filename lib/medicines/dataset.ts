import type { CatalogRow } from './brand-preflight'
import { makeBrand, medicineForm } from './brand'
export function datasetBrand(row: CatalogRow) {
  // In this layout 'type' can mean medical system, not dosage form. Use an
  // explicit form when present; otherwise retain a recognized suffix verbatim.
  const suffix = /\b((?:mouth[- ]dissolving |dispersible |chewable |oral )?(?:tablets?|capsules?|syrup|suspension|drops?|injection|ointment|cream|gel|inhaler|powder|sachets?))$/iu.exec(row.name.trim())?.[1]
  const formText = row.form || (medicineForm(row.type) !== 'OTHER' ? row.type : suffix || 'Other')
  const system = (row.system || row.type || '').toUpperCase()
  return makeBrand({source:'SEED_DATASET',sourceId:row.id,name:row.name.normalize('NFKC').trim().replace(/\s+/gu,' '),formText,
    manufacturer:row.manufacturer_name,compositionText:[row.short_composition1,row.short_composition2].filter(Boolean).join(' and '),packSize:row.pack_size_label,
    system:system==='AYUSH'||system==='AYURVEDIC'?'AYUSH':system==='ALLOPATHY'?'ALLOPATHY':'OTHER',
    isDiscontinued:['true','1','yes'].includes(row.Is_discontinued.toLowerCase().trim()),discontinuedKnown:true})
}
