import { Patient, Visit, Prescription } from '@/lib/generated/prisma/client'
import { PatientFormData } from '@/lib/validations/patient.schema'

export type { PatientFormData }

export type VisitWithPrescriptions = Visit & {
  prescriptions: Prescription[]
}

export type PatientWithVisits = Patient & {
  visits: VisitWithPrescriptions[]
  prescriptions: Prescription[]
}
