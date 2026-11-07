import { createHash } from 'node:crypto'
import { normalizeBrandSearch } from './brand-preflight'
import type { Brand, DoctorMedicinePref, MedicineForm } from '../generated/prisma/client'
export const catalogHash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex')
export function medicineForm(text: string): MedicineForm {
  const value = text.toLowerCase()
  for (const [pattern, form] of [
    [/injection|injectable/, 'INJECTION'], [/tablet|\btab\b/, 'TABLET'], [/capsule|\bcap\b/, 'CAPSULE'],
    [/suspension/, 'SUSPENSION'], [/syrup|\bsyp\b/, 'SYRUP'], [/drops|\bdrop\b/, 'DROPS'],
    [/ointment/, 'OINTMENT'], [/cream/, 'CREAM'], [/\bgel\b/, 'GEL'], [/inhal|aerosol/, 'INHALER'],
    [/sachet/, 'SACHET'], [/powder|churna/, 'POWDER'],
  ] as const) if (pattern.test(value)) return form
  return 'OTHER'
}
export function strengthText(name: string) {
  const amount = String.raw`\d+(?:\.\d+)?\s*(?:micrograms?|mcg|milligrams?|mg|grams?|g|iu|units?|%|milliliters?|ml)(?:\s*\/\s*(?:\d+(?:\.\d+)?\s*)?(?:ml|dose|g|vial))?`
  const match = new RegExp(String.raw`(?:^|\s)(${amount}(?:\s*(?:\+|and)\s*${amount})*)`, 'iu').exec(name)
  return match?.[1] || null
}
export type BrandChoice = {
  id: string; brandId?: string; brandName?: string; name: string; generic: string | null; form: string | null
  manufacturer: string | null; strengthText?: string | null; system: string
  composition?: string; isFavorite?: boolean; defaults?: Pick<DoctorMedicinePref, 'defaultPattern' | 'defaultFood' | 'defaultDurationDays' | 'defaultInstruction' | 'defaultDosage' | 'defaultFrequency' | 'defaultDuration'> | null
}
export function brandChoice(brand: Brand, pref?: DoctorMedicinePref | null): BrandChoice {
  return { id: brand.id, brandId: brand.id, brandName: brand.name, name: brand.name, generic: brand.compositionText || null,
    form: brand.formText, manufacturer: brand.manufacturer, strengthText: brand.strengthText,
    composition: brand.compositionText, system: brand.system === 'AYUSH' ? 'AYURVEDIC' : brand.system,
    isFavorite: pref?.isFavorite || false, defaults: pref ? {
      defaultPattern: pref.defaultPattern, defaultFood: pref.defaultFood, defaultDurationDays: pref.defaultDurationDays,
      defaultInstruction: pref.defaultInstruction, defaultDosage: pref.defaultDosage,
      defaultFrequency: pref.defaultFrequency, defaultDuration: pref.defaultDuration,
    } : null }
}
export function makeBrand(input: { source: Brand['source']; sourceId: string; name: string; formText: string; manufacturer?: string | null; compositionText?: string; system?: Brand['system']; packSize?: string | null; isDiscontinued?: boolean; discontinuedKnown?: boolean; createdByDoctorId?: string }) {
  const compositionText = input.compositionText || ''
  const identityKey = catalogHash([input.name, input.formText, input.manufacturer || '', compositionText].map(value => value.normalize('NFKC').trim().replace(/\s+/gu,' ').toLowerCase()))
  return { ...input, compositionText, identityKey, id: `brand_${identityKey}`, form: medicineForm(input.formText),
    strengthText: strengthText(input.name), nameNormalized: normalizeBrandSearch(input.name),
    searchText: normalizeBrandSearch(`${input.name} ${input.manufacturer || ''} ${compositionText}`), system: input.system || 'OTHER',
    verified: false, packSize: input.packSize || null, isDiscontinued: input.isDiscontinued || false, discontinuedKnown: input.discontinuedKnown || false }
}
