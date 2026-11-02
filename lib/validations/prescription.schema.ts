import { z } from 'zod'

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
