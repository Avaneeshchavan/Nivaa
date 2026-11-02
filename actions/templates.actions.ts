'use server'

import prisma from '@/lib/prisma'
import { getCurrentDoctor } from './auth.actions'
import { revalidatePath } from 'next/cache'
import { defaultTemplates } from '@/lib/templates/defaultTemplates'

export async function getTemplates() {
  const doctor = await getCurrentDoctor()
  if (!doctor) throw new Error('Unauthorized')

  return await prisma.diseaseTemplate.findMany({
    where: { doctorId: doctor.id },
    orderBy: { createdAt: 'desc' }
  })
}

export async function createTemplate(data: {
  name: string
  diagnosis?: string
  medicines: any
}) {
  const doctor = await getCurrentDoctor()
  if (!doctor) throw new Error('Unauthorized')

  const newTemplate = await prisma.diseaseTemplate.create({
    data: {
      name: data.name,
      diagnosis: data.diagnosis || null,
      medicines: data.medicines || [],
      doctorId: doctor.id
    }
  })

  revalidatePath('/settings')
  return newTemplate
}

export async function updateTemplate(
  id: string,
  data: {
    name: string
    diagnosis?: string
    medicines: any
  }
) {
  const doctor = await getCurrentDoctor()
  if (!doctor) throw new Error('Unauthorized')

  // Verify ownership
  const existing = await prisma.diseaseTemplate.findFirst({
    where: { id, doctorId: doctor.id }
  })
  if (!existing) throw new Error('Template not found or unauthorized')

  const updated = await prisma.diseaseTemplate.update({
    where: { id },
    data: {
      name: data.name,
      diagnosis: data.diagnosis || null,
      medicines: data.medicines || []
    }
  })

  revalidatePath('/settings')
  return updated
}

export async function deleteTemplate(id: string) {
  const doctor = await getCurrentDoctor()
  if (!doctor) throw new Error('Unauthorized')

  // Verify ownership
  const existing = await prisma.diseaseTemplate.findFirst({
    where: { id, doctorId: doctor.id }
  })
  if (!existing) throw new Error('Template not found or unauthorized')

  await prisma.diseaseTemplate.delete({
    where: { id }
  })

  revalidatePath('/settings')
  return { success: true }
}

export async function seedDefaultTemplates() {
  const doctor = await getCurrentDoctor()
  if (!doctor) throw new Error('Unauthorized')

  const count = await prisma.diseaseTemplate.count({
    where: { doctorId: doctor.id }
  })

  // We seed the default templates
  const created = []
  for (const template of defaultTemplates) {
    const newT = await prisma.diseaseTemplate.create({
      data: {
        name: template.name,
        diagnosis: template.diagnosis,
        medicines: template.medicines as any,
        doctorId: doctor.id
      }
    })
    created.push(newT)
  }

  revalidatePath('/settings')
  return created
}
