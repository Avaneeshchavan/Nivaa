import { z } from 'zod'
import { doseUnits } from '../rx/dose'
export const medicineUseSchema = z.object({
  brandId: z.string().min(1).max(100), dosage: z.string().trim().max(160),
  frequency: z.string().trim().max(160), duration: z.string().trim().max(160),
  instructions: z.string().max(1000),
  pattern: z.string().max(80).optional(), food: z.enum(['BEFORE','AFTER','WITH','EMPTY','ANY']).optional(),
  doseUnit: z.enum(doseUnits).optional(),
  durationDays: z.number().int().positive().max(3650).nullish(),
})
export type MedicineUse = z.input<typeof medicineUseSchema>
