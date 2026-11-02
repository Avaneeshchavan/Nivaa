'use server'

import prisma from '@/lib/prisma'
import { getCurrentDoctor } from './auth.actions'
import { revalidatePath } from 'next/cache'
import { parseRxMedicines, type DuplicateRxDraft } from '@/lib/validations/prescription.schema'
import { RxMedicine } from '@/stores/rxBuilderStore'

interface CreatePrescriptionInput {
  patientId: string
  diagnosis: string
  medicines: RxMedicine[]
  notes: string
}

export async function createPrescription(data: CreatePrescriptionInput) {
  const doctor = await getCurrentDoctor()
  if (!doctor) throw new Error('Unauthorized')

  // First verify patient ownership
  const patient = await prisma.patient.findFirst({
    where: { id: data.patientId, doctorId: doctor.id }
  })

  if (!patient) throw new Error('Patient not found or unauthorized')

  // Create a new visit automatically for this prescription
  // Or attach to a new prescription directly. For our schema, visitId is optional on Prescription.
  // We'll create a Visit to keep the timeline consistent.
  const visit = await prisma.visit.create({
    data: {
      patientId: patient.id,
      doctorId: doctor.id,
      diagnosis: data.diagnosis,
    }
  })

  const prescription = await prisma.prescription.create({
    data: {
      patientId: patient.id,
      doctorId: doctor.id,
      visitId: visit.id,
      diagnosis: data.diagnosis,
      notes: data.notes,
      medicines: data.medicines as any, // Storing as JSON
    }
  })

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
