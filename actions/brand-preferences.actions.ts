'use server'
import prisma from '@/lib/prisma'
import { getCurrentDoctor } from './auth.actions'
import { withSafeActionError } from '@/lib/security/action-error'
import { medicineUseSchema, type MedicineUse } from '@/lib/medicines/usage'
import { z } from 'zod'
export async function rememberMedicineUse(input: MedicineUse) {
  return withSafeActionError('Medicine preferences unavailable. Try again.', async () => {
    const doctor = await getCurrentDoctor()
    if (!doctor) throw new Error('Unauthorized')
    const data = medicineUseSchema.parse(input)
    if (!await prisma.brand.findFirst({ where: { id: data.brandId, isDiscontinued: false }, select: { id: true } })) throw new Error('Medicine unavailable')
    const values = { lastUsedAt: new Date(), defaultDosage: data.dosage, defaultFrequency: data.frequency,
      defaultDuration: data.duration, defaultInstruction: data.instructions,
      ...(data.doseUnit !== undefined ? { defaultDoseUnit: data.doseUnit } : {}),
      ...(data.pattern !== undefined ? { defaultPattern: data.pattern } : {}),
      ...(data.food !== undefined ? { defaultFood: data.food } : {}),
      ...(data.durationDays !== undefined ? { defaultDurationDays: data.durationDays } : {}) }
    await prisma.doctorMedicinePref.upsert({
      where: { doctorId_brandId: { doctorId: doctor.id, brandId: data.brandId } },
      create: { doctorId: doctor.id, brandId: data.brandId, useCount: 1, ...values },
      update: { useCount: { increment: 1 }, ...values },
    })
  })
}
export async function setMedicineFavorite(id: string, favorite: boolean) {
  return withSafeActionError('Medicine favorites unavailable. Try again.', async () => {
    const doctor = await getCurrentDoctor()
    if (!doctor) throw new Error('Unauthorized')
    id = z.string().min(1).max(100).parse(id)
    favorite = z.boolean().parse(favorite)
    if (!await prisma.brand.findFirst({ where: { id, isDiscontinued: false }, select: { id: true } })) throw new Error('Medicine unavailable')
    await prisma.doctorMedicinePref.upsert({ where: { doctorId_brandId: { doctorId: doctor.id, brandId: id } },
      create: { doctorId: doctor.id, brandId: id, isFavorite: favorite }, update: { isFavorite: favorite } })
  })
}
