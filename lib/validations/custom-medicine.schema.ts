import { z } from 'zod'

export const medicineForms = ['tablet', 'capsule', 'syrup', 'suspension', 'drops', 'injection', 'ointment', 'cream', 'gel', 'inhaler', 'powder', 'sachet', 'other'] as const
export const normalizeMedicineText = (value: string) => value.normalize('NFKC').trim().replace(/\s+/gu, ' ')
const text = (max: number) => z.string().transform(normalizeMedicineText).pipe(z.string().max(max))

export const customMedicineSchema = z.object({
  system: z.enum(['ALLOPATHY', 'AYURVEDIC']).default('ALLOPATHY'),
  name: text(160).pipe(z.string().min(1, 'Enter a medicine name.')),
  form: z.enum(medicineForms).optional(),
  strength: text(80).optional(),
  manufacturer: text(160).optional(),
  generic: text(240).optional(),
}).refine(data => [data.name, data.strength].filter(Boolean).join(' ').length <= 240, {
  message: 'Name and strength together must be at most 240 characters.', path: ['name'],
})
export type CustomMedicineInput = z.input<typeof customMedicineSchema>
