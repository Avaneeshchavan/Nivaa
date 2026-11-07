'use server'

import { prescriptionPatientSelect } from '@/lib/prescription-patient'
import prisma from '@/lib/prisma'
import { getCurrentDoctor } from './auth.actions'
import { patientSchema, type PatientFormData } from '@/lib/validations/patient.schema'
import { revalidatePath } from 'next/cache'

export async function getPatients(search?: string) {
  const doctor = await getCurrentDoctor()
  if (!doctor) throw new Error('Unauthorized')

  const term = search?.trim().slice(0, 100)
  const pattern = term ? `%${term.replace(/[\\%_]/g, '\\$&')}%` : ''
  // Separate indexed branches avoid a correlated scan of every patient's history.
  const matches = term ? await prisma.$queryRaw<{ id: string }[]>`
    SELECT p.id FROM "Patient" p
    WHERE p."doctorId" = ${doctor.id} AND p.id IN (
      SELECT id FROM "Patient" WHERE "doctorId" = ${doctor.id} AND name ILIKE ${pattern}
      UNION SELECT id FROM "Patient" WHERE "doctorId" = ${doctor.id} AND phone ILIKE ${pattern}
      UNION SELECT "patientId" FROM "Visit" WHERE "doctorId" = ${doctor.id} AND diagnosis ILIKE ${pattern}
      UNION SELECT "patientId" FROM "Prescription" WHERE "doctorId" = ${doctor.id} AND diagnosis ILIKE ${pattern}
      UNION SELECT "patientId" FROM "Prescription" WHERE "doctorId" = ${doctor.id}
        AND jsonb_path_query_array(medicines, '$[*].name')::text ILIKE ${pattern}
    ) ORDER BY p."updatedAt" DESC LIMIT 50
  ` : null

  const patients = await prisma.patient.findMany({
    where: { doctorId: doctor.id, ...(matches ? { id: { in: matches.map(p => p.id) } } : {}) },
    take: 50,
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true, name: true, phone: true,
      visits: { orderBy: { date: 'desc' }, take: 1, select: { date: true } },
    },
  })

  return patients
}

export async function getPatient(id: string) {
  const doctor = await getCurrentDoctor()
  if (!doctor) throw new Error('Unauthorized')

  const patient = await prisma.patient.findFirst({
    where: {
      id,
      doctorId: doctor.id,
    },
    include: {
      visits: {
        orderBy: { date: 'desc' },
        include: { prescriptions: { select: { id: true, createdAt: true } } },
      },
    },
  })

  if (!patient) throw new Error('Patient not found')
  return patient
}

export async function createPatient(data: PatientFormData) {
  data = patientSchema.parse(data)
  const doctor = await getCurrentDoctor()
  if (!doctor) throw new Error('Unauthorized')

  const newPatient = await prisma.patient.create({
    data: {
      ...data,
      dob: data.dob ? new Date(data.dob) : null,
      doctorId: doctor.id,
    },
    select: { id: true },
  })

  revalidatePath('/patients')
  return newPatient
}

export async function updatePatient(id: string, data: PatientFormData) {
  data = patientSchema.parse(data)
  const doctor = await getCurrentDoctor()
  if (!doctor) throw new Error('Unauthorized')

  const updatedPatient = await prisma.patient.update({
    where: { id, doctorId: doctor.id },
    data: {
      ...data,
      dob: data.dob ? new Date(data.dob) : null,
    },
  })

  revalidatePath('/patients')
  revalidatePath(`/patients/${id}`)
  return updatedPatient
}

export async function findDuplicatePatients(name: string, phone: string) {
  const doctor = await getCurrentDoctor()
  if (!doctor) throw new Error('Unauthorized')
  const normalizedPhone = phone.replace(/[^0-9]/g, '')
  if (name.trim().length < 2 || name.length > 160 || normalizedPhone.length < 7 || normalizedPhone.length > 15) return []
  return prisma.$queryRaw<{ id: string; name: string; phone: string | null }[]>`
    SELECT id, name, phone FROM "Patient"
    WHERE "doctorId" = ${doctor.id}
      AND regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g') = ${normalizedPhone}
      AND public.nivaa_patient_name_similarity(name, ${name.trim()}) >= 0.35
    ORDER BY public.nivaa_patient_name_similarity(name, ${name.trim()}) DESC LIMIT 5
  `
}

export async function getPrescriptionPatients(search?: string) {
  const doctor = await getCurrentDoctor()
  if (!doctor) throw new Error('Unauthorized')
  const term = search?.trim().slice(0, 100)
  if (!term) return []
  return prisma.patient.findMany({
    where: { doctorId: doctor.id, OR: [
      { name: { contains: term, mode: 'insensitive' } },
      { phone: { contains: term, mode: 'insensitive' } },
    ] },
    select: prescriptionPatientSelect, orderBy: { updatedAt: 'desc' }, take: 25,
  })
}

export async function getPatientForEdit(id: string) {
  const doctor = await getCurrentDoctor()
  if (!doctor) throw new Error('Unauthorized')
  const patient = await prisma.patient.findFirst({ where: { id, doctorId: doctor.id } })
  if (!patient) throw new Error('Patient not found')
  return patient
}
