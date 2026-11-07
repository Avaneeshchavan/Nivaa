import { z } from 'zod'
import { emptyHandwriting, handwritingSchema } from './handwriting.schema'
import { visitSchema } from './visit.schema'

export const rxMedicineSchema = z.object({
  id: z.string(),
  name: z.string().trim().min(1).max(240),
  generic: z.string().nullish(),
  form: z.string().nullish(),
  dosage: z.string(),
  frequency: z.string(),
  duration: z.string(),
  instructions: z.string().nullish().transform(value => value ?? ''),
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
  patientId: z.string().min(1),
  diagnosis: z.string().trim().max(4000),
  medicines: z.array(rxMedicineSchema).max(100),
  notes: z.string().max(8000),
  visit: visitSchema.optional(),
  handwriting: handwritingSchema.default(emptyHandwriting),
})
export type CreatePrescriptionInput = z.input<typeof prescriptionSchema>
