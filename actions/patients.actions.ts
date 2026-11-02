'use server'

import prisma from '@/lib/prisma'
import { getCurrentDoctor } from './auth.actions'
import { PatientFormData } from '@/types'
import { revalidatePath } from 'next/cache'

export async function getPatients(search?: string) {
  const doctor = await getCurrentDoctor()
  if (!doctor) throw new Error('Unauthorized')

  const patients = await prisma.patient.findMany({
    where: {
      doctorId: doctor.id,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { phone: { contains: search } },
            ],
          }
        : {}),
    },
    orderBy: { updatedAt: 'desc' },
    include: {
      visits: {
        orderBy: { date: 'desc' },
        take: 1,
      },
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
        include: { prescriptions: true },
      },
      prescriptions: true,
    },
  })

  if (!patient) throw new Error('Patient not found')
  return patient
}

export async function createPatient(data: PatientFormData) {
  const doctor = await getCurrentDoctor()
  if (!doctor) throw new Error('Unauthorized')

  const newPatient = await prisma.patient.create({
    data: {
      ...data,
      dob: data.dob ? new Date(data.dob) : null,
      doctorId: doctor.id,
    },
  })

  revalidatePath('/patients')
  return newPatient
}

export async function updatePatient(id: string, data: PatientFormData) {
  const doctor = await getCurrentDoctor()
  if (!doctor) throw new Error('Unauthorized')

  // First verify ownership
  const existing = await prisma.patient.findFirst({
    where: { id, doctorId: doctor.id },
  })

  if (!existing) throw new Error('Patient not found or unauthorized')

  const updatedPatient = await prisma.patient.update({
    where: { id },
    data: {
      ...data,
      dob: data.dob ? new Date(data.dob) : null,
    },
  })

  revalidatePath('/patients')
  revalidatePath(`/patients/${id}`)
  return updatedPatient
}
