import * as z from 'zod'

export const patientSchema = z.object({
  name: z.string().trim().max(160).min(2, { message: 'Name must be at least 2 characters.' }),
  dob: z.union([z.literal(''), z.iso.date().refine(value => value <= new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }), 'Date of birth cannot be in the future')]).optional().nullable(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional().nullable(),
  phone: z
    .string()
    .regex(/^\+?[1-9]\d{1,14}$/, { message: 'Must be a valid E.164 phone number.' })
    .optional()
    .or(z.literal(''))
    .nullable(),
  address: z.string().trim().max(2000).optional().nullable(),
  allergies: z.string().trim().max(2000).optional().nullable(),
})

export type PatientFormData = z.infer<typeof patientSchema>
