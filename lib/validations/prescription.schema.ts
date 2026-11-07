import { z } from 'zod'
import { emptyHandwriting, handwritingSchema } from './handwriting.schema'
import { clinicToday, parseDosePattern } from '../rx/dose'
import { visitSchema } from './visit.schema'

export const rxMedicineSchema = z.object({
  pattern: z.string().max(80).optional(),
  food: z.enum(['BEFORE','AFTER','WITH','EMPTY','ANY']).optional(),
  doseUnit: z.string().max(40).optional(),
  durationDays: z.number().int().positive().max(3650).nullish(),
  quantity: z.number().finite().positive().max(10000000).nullish(),
  brandId: z.string().max(100).optional(),
  manufacturer: z.string().max(500).nullish(),
  strengthText: z.string().max(240).nullish(),
  composition: z.string().max(4000).optional(),
  id: z.string().min(1).max(100),
  name: z.string().trim().min(1).max(240),
  generic: z.string().max(4000).nullish(),
  form: z.string().max(80).nullish(),
  dosage: z.string().max(160),
  frequency: z.string().max(160),
  duration: z.string().max(160),
  instructions: z.string().max(1000).nullish().transform(value => value ?? ''),
})

export function parseRxMedicines(value: unknown) {
  return z.array(rxMedicineSchema).parse(typeof value === 'string' ? JSON.parse(value) : value)
}

export interface DuplicateRxDraft {
  sourceId: string
  patientId: string
  diagnosis: string
  medicines: z.output<typeof rxMedicineSchema>[]
  notes: string
}

export const prescriptionSchema = z.object({
  followUpDate: z.union([z.literal(''), z.iso.date().refine(value => value >= clinicToday(), 'Choose today or a future follow-up date')]).optional(),
  patientId: z.string().min(1).max(100),
  diagnosis: z.string().trim().max(4000),
  medicines: z.array(rxMedicineSchema).max(100),
  notes: z.string().max(8000),
  visit: visitSchema.optional(),
  handwriting: handwritingSchema.default(emptyHandwriting),
}).refine(value => value.medicines.every(m => !m.pattern || parseDosePattern(m.pattern)), { path: ['medicines'], message: 'Check the morning-afternoon-night pattern' })
export type CreatePrescriptionInput = z.input<typeof prescriptionSchema>
