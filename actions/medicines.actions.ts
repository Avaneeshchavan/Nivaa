'use server'

import { z } from 'zod'
import prisma from '@/lib/prisma'
import { getCurrentDoctor } from './auth.actions'
import { medicineCatalogId } from '@/lib/medicines/catalog'

const customMedicineSchema = z.object({
  name: z.string().trim().min(1).max(160),
  strength: z.string().trim().max(80).optional(),
  form: z.string().trim().max(80).optional(),
})

export async function createCustomMedicine(input: { name: string; strength?: string; form?: string }) {
  if (!await getCurrentDoctor()) throw new Error('Unauthorized')
  const data = customMedicineSchema.parse(input)
  // The model has no strength column; preserve strength in the display name.
  const name = [data.name, data.strength].filter(Boolean).join(' ')
  const form = data.form || null
  return prisma.medicine.upsert({
    where: { id: medicineCatalogId(name, form) },
    create: { name, form },
    update: {},
  })
}
