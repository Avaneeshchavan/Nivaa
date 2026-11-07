import type { Patient } from '@/lib/generated/prisma/client'

export type PrescriptionPatient = Pick<Patient, 'id' | 'name' | 'dob' | 'gender' | 'phone' | 'allergies'>
export const prescriptionPatientSelect = { id: true, name: true, dob: true, gender: true, phone: true, allergies: true } as const
