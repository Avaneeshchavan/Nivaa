import { emptyHandwriting, handwritingSchema } from './handwriting.schema'
import { z } from 'zod'
import { rxMedicineSchema } from './prescription.schema'
export const draftKeySchema = z.string().min(1).max(160).regex(/^[a-zA-Z0-9_-]+$/)
export const rxDraftSchema = z.object({
  patientId: z.string().max(100).nullable(),
  diagnosis: z.string().max(4000),
  medicines: z.array(rxMedicineSchema).max(100),
  notes: z.string().max(8000),
  handwriting: handwritingSchema.default(emptyHandwriting),
  templateId: z.string().max(100).nullable(),
  visit: z.object({ weightKg: z.string().max(20), bloodPressure: z.string().max(20), temperatureC: z.string().max(20), spo2: z.string().max(20) }),
})
export type RxDraft = z.output<typeof rxDraftSchema>
