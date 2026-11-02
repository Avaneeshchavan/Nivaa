import * as z from 'zod'

export const patientSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  dob: z.string().optional().nullable(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional().nullable(),
  phone: z
    .string()
    .regex(/^\+?[1-9]\d{1,14}$/, { message: 'Must be a valid E.164 phone number.' })
    .optional()
    .or(z.literal(''))
    .nullable(),
  address: z.string().optional().nullable(),
  allergies: z.string().trim().max(2000).optional().nullable(),
})

export type PatientFormData = z.infer<typeof patientSchema>
