'use server'

import prisma from '@/lib/prisma'
import { getCurrentDoctor } from './auth.actions'
import { medicineCatalogId } from '@/lib/medicines/catalog'
import { customMedicineSchema, type CustomMedicineInput } from '@/lib/validations/custom-medicine.schema'
import type { Medicine } from '@/lib/generated/prisma/client'

export async function createCustomMedicine(input: CustomMedicineInput) {
  if (!await getCurrentDoctor()) throw new Error('Unauthorized')
  const parsed = customMedicineSchema.safeParse(input)
  if (!parsed.success) throw new Error('Check the medicine name and optional details.')
  const data = parsed.data
  // Keep legacy Rx snapshots compatible: strength remains in the display name.
  const name = [data.name, data.strength].filter(Boolean).join(' ')
  const form = data.form || null
  try {
    // The expression index also covers legacy generated IDs and concurrent saves.
    // Do not overwrite an existing catalog record with another doctor's metadata.
    const inserted = await prisma.$queryRaw<Medicine[]>`
      INSERT INTO public."Medicine" ("id", "name", "form", "system", "manufacturer", "generic", "createdAt", "updatedAt")
      VALUES (${medicineCatalogId(name, form)}, ${name}, ${form}, ${data.system}, ${data.manufacturer || null}, ${data.generic || null}, NOW(), NOW())
      ON CONFLICT DO NOTHING RETURNING *
    `
    if (inserted[0]) return { medicine: inserted[0], alreadyExists: false }
    const existing = await prisma.$queryRaw<Medicine[]>`
      SELECT * FROM public."Medicine"
      WHERE public.nivaa_medicine_normalize("name") = public.nivaa_medicine_normalize(${name})
        AND public.nivaa_medicine_normalize("form") = public.nivaa_medicine_normalize(${form})
      LIMIT 1
    `
    if (existing[0]) return { medicine: existing[0], alreadyExists: true }
    throw new Error('Catalog conflict')
  } catch {
    throw new Error('Could not save the medicine. Try again.')
  }
}
