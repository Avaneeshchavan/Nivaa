'use server'

import prisma from '@/lib/prisma'
import { getCurrentDoctor } from './auth.actions'
import { revalidatePath } from 'next/cache'
import { parseRxMedicines, prescriptionSchema, type CreatePrescriptionInput, type DuplicateRxDraft } from '@/lib/validations/prescription.schema'

export async function createPrescription(data: CreatePrescriptionInput) {
  const doctor = await getCurrentDoctor()
  if (!doctor) throw new Error('Unauthorized')

  const input = prescriptionSchema.parse(data)

  // First verify patient ownership
  const patient = await prisma.patient.findFirst({
    where: { id: input.patientId, doctorId: doctor.id }, select: { id: true }
  })

  if (!patient) throw new Error('Patient not found or unauthorized')

  // The visit and its new Rx are one write: no orphan visit if saving fails.
  const visit = await prisma.visit.create({
    data: {
      patientId: patient.id,
      doctorId: doctor.id,
      diagnosis: input.diagnosis,
      ...input.visit,
      prescriptions: {
        create: {
          patientId: patient.id,
          doctorId: doctor.id,
          diagnosis: input.diagnosis,
          notes: input.notes,
          handwriting: input.handwriting,
          medicines: input.medicines,
        },
      },
    },
    select: { prescriptions: { select: { id: true } } },
  })
  const prescription = visit.prescriptions[0]

  revalidatePath(`/patients/${patient.id}`)
  revalidatePath('/patients')
  
  return prescription
}

export async function getPrescriptionForDuplicate(id: string): Promise<DuplicateRxDraft | null> {
  const doctor = await getCurrentDoctor()
  if (!doctor) throw new Error('Unauthorized')
  const source = await prisma.prescription.findFirst({
    where: { id, doctorId: doctor.id, patient: { doctorId: doctor.id } },
  })
  if (!source) return null
  return {
    sourceId: source.id,
    patientId: source.patientId,
    diagnosis: source.diagnosis || '',
    medicines: parseRxMedicines(source.medicines),
    notes: source.notes || '',
  }
}
