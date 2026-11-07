'use server'

import { withSafeActionError } from '@/lib/security/action-error'

import { recordIdSchema } from '@/lib/validations/id.schema'

import { recordAudit } from '@/lib/security/audit'
import prisma from '@/lib/prisma'
import { prescriptionPatientSelect } from '@/lib/prescription-patient'
import { quantityForPattern } from '@/lib/rx/dose'
import { getCurrentDoctor } from './auth.actions'
import { revalidatePath } from 'next/cache'
import { parseRxMedicines, prescriptionSchema, type CreatePrescriptionInput, type DuplicateRxDraft } from '@/lib/validations/prescription.schema'

export async function createPrescription(data: CreatePrescriptionInput) {
  return withSafeActionError('Prescription request unavailable. Try again.', async () => {
    const doctor = await getCurrentDoctor()
    if (!doctor) throw new Error('Unauthorized')

    const input = prescriptionSchema.parse(data)

    // First verify patient ownership
    const patient = await prisma.patient.findFirst({
      where: { id: input.patientId, doctorId: doctor.id }, select: { id: true }
    })

    if (!patient) throw new Error('Patient not found or unauthorized')

    // The visit and its new Rx are one write: no orphan visit if saving fails.
    const prescription = await prisma.$transaction(async tx => {
      const visit = await tx.visit.create({
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
              followUpDate: input.followUpDate ? new Date(`${input.followUpDate}T00:00:00.000Z`) : null,
              handwriting: input.handwriting,
              medicines: input.medicines.map(m => ({ ...m, quantity: m.doseUnit && m.doseUnit !== 'other' ? quantityForPattern(m.pattern || '', m.durationDays, m.frequency) : null })),
            },
          },
        },
        select: { prescriptions: { select: { id: true } } },
      })
      const prescription = visit.prescriptions[0]
      await recordAudit(doctor.id, 'PRESCRIPTION_CREATE', prescription.id, tx)
      return prescription
    })

    revalidatePath(`/patients/${patient.id}`)
    revalidatePath('/patients')

    return prescription
  })
}

export async function getPrescriptionForDuplicate(id: string): Promise<DuplicateRxDraft | null> {
  return withSafeActionError('Prescription request unavailable. Try again.', async () => {
    id = recordIdSchema.parse(id)
    const doctor = await getCurrentDoctor()
    if (!doctor) throw new Error('Unauthorized')
    const source = await prisma.prescription.findFirst({
      where: { id, doctorId: doctor.id, patient: { doctorId: doctor.id } },
    })
    if (!source) return null
    await recordAudit(doctor.id, 'PRESCRIPTION_COPY', source.id)
    return {
      sourceId: source.id,
      patientId: source.patientId,
      diagnosis: source.diagnosis || '',
      medicines: parseRxMedicines(source.medicines),
      notes: source.notes || '',
    }
  })
}

export async function getLastPrescriptionForRepeat(patientId: string): Promise<DuplicateRxDraft | null> {
  return withSafeActionError('Previous prescription unavailable. Try again.', async () => {
    patientId = recordIdSchema.parse(patientId)
    const doctor = await getCurrentDoctor()
    if (!doctor) throw new Error('Unauthorized')
    const source = await prisma.prescription.findFirst({
      where: { patientId, doctorId: doctor.id, patient: { doctorId: doctor.id } },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: { id: true, patientId: true, diagnosis: true, medicines: true, notes: true },
    })
    if (!source) return null
    await recordAudit(doctor.id, 'PRESCRIPTION_COPY', source.id)
    return { sourceId: source.id, patientId: source.patientId, diagnosis: source.diagnosis || '', medicines: parseRxMedicines(source.medicines), notes: source.notes || '' }
  })
}

export async function getRxPatientContext(patientId: string) {
  return withSafeActionError('Patient details unavailable. Try again.', async () => {
    patientId = recordIdSchema.parse(patientId)
    const doctor = await getCurrentDoctor()
    if (!doctor) throw new Error('Unauthorized')
    return prisma.patient.findFirst({ where: { id: patientId, doctorId: doctor.id }, select: prescriptionPatientSelect })
  })
}
