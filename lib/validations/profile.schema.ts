import { z } from 'zod'

export const profileSchema = z.object({
  name: z.string().trim().max(160).nullish(),
  license: z.string().trim().max(160).nullish(),
  clinicName: z.string().trim().max(160).nullish(),
  address: z.string().trim().max(2000).nullish(),
  phone: z.string().trim().max(40).nullish(),
  logoUrl: z.string().max(1000).nullish(),
})
