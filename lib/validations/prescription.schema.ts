import { z } from 'zod'
import { emptyHandwriting, handwritingSchema } from './handwriting.schema'
import { visitSchema } from './visit.schema'

export const rxMedicineSchema = z.object({
  id: z.string().min(1).max(100),
  name: z.string().trim().min(1).max(240),
  generic: z.string().max(240).nullish(),
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
  patientId: z.string().min(1).max(100),
  diagnosis: z.string().trim().max(4000),
  medicines: z.array(rxMedicineSchema).max(100),
  notes: z.string().max(8000),
  visit: visitSchema.optional(),
  handwriting: handwritingSchema.default(emptyHandwriting),
})
export type CreatePrescriptionInput = z.input<typeof prescriptionSchema>
