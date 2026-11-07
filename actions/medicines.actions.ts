'use server'
import prisma from '@/lib/prisma'
import { getCurrentDoctor } from './auth.actions'
import { customMedicineSchema, type CustomMedicineInput } from '@/lib/validations/custom-medicine.schema'
import { brandChoice, makeBrand, medicineForm } from '@/lib/medicines/brand'
import { normalizeBrandSearch } from '@/lib/medicines/brand-preflight'
import { sourceCompositions } from '@/lib/medicines/compositions'
import { insertBrandsSql } from '@/lib/medicines/brand-sql'
export async function createCustomMedicine(input: CustomMedicineInput) {
  const doctor = await getCurrentDoctor()
  if (!doctor) throw new Error('Unauthorized')
  const parsed = customMedicineSchema.safeParse(input)
  if (!parsed.success) throw new Error('Check the medicine name and optional details.')
  const data = parsed.data
  const name = [data.name, data.strength].filter(Boolean).join(' ')
  try {
    return await prisma.$transaction(async tx => {
      const existing = await tx.brand.findFirst({ where: {
        nameNormalized: normalizeBrandSearch(name),
        OR: [{ formText: { equals: data.form || '', mode: 'insensitive' } }, { form: medicineForm(data.form || '') }],
        isDiscontinued: false,
      }, orderBy: { id: 'asc' } })
      const brand = makeBrand({ name, formText: data.form || '', manufacturer: data.manufacturer || null,
        compositionText: data.generic || '', source: 'DOCTOR_ADDED', sourceId: crypto.randomUUID(),
        system: data.system === 'AYURVEDIC' ? 'AYUSH' : 'ALLOPATHY', createdByDoctorId: doctor.id })
      const inserted = existing ? [] : await tx.$queryRawUnsafe<{ id: string }[]>(insertBrandsSql, JSON.stringify([brand]))
      const saved = existing || await tx.brand.findUniqueOrThrow({ where: { id: brand.id } })
      if (inserted.length) {
        const components = sourceCompositions(saved.compositionText, saved.formText)
        for (const [order, component] of components.entries()) {
          await tx.composition.upsert({ where: { id: component.id }, create: component, update: {} })
          await tx.brandComposition.upsert({ where: { brandId_order: { brandId: saved.id, order } },
            create: { brandId: saved.id, compositionId: component.id, order }, update: {} })
        }
      }
      await tx.doctorMedicinePref.upsert({ where: { doctorId_brandId: { doctorId: doctor.id, brandId: saved.id } },
        create: { doctorId: doctor.id, brandId: saved.id, isFavorite: true }, update: { isFavorite: true } })
      return { medicine: brandChoice(saved), alreadyExists: !inserted.length }
    })
  } catch { throw new Error('Could not save the medicine. Try again.') }
}
