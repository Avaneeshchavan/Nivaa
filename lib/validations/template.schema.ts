import { z } from 'zod'
import { rxMedicineSchema } from './prescription.schema'

export const templateSchema = z.object({
  name: z.string().trim().min(1).max(160),
  diagnosis: z.string().trim().max(4000).optional(),
  medicines: z.array(rxMedicineSchema).max(100),
})
export type TemplateInput = z.input<typeof templateSchema>
