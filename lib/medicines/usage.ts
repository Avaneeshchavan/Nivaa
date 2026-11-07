import { z } from 'zod'
export const medicineUseSchema = z.object({
  brandId: z.string().min(1).max(100), dosage: z.string().trim().max(160),
  frequency: z.string().trim().max(160), duration: z.string().trim().max(160),
  instructions: z.string().max(1000),
  pattern: z.string().max(80).optional(), food: z.enum(['BEFORE','AFTER','WITH','ANY']).optional(),
  durationDays: z.number().int().positive().max(3650).optional(),
})
export type MedicineUse = z.input<typeof medicineUseSchema>
