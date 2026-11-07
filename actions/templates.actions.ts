'use server'

import { withSafeActionError } from '@/lib/security/action-error'

import { recordIdSchema } from '@/lib/validations/id.schema'

import { createHash } from 'node:crypto'
import prisma from '@/lib/prisma'
import { getCurrentDoctor } from './auth.actions'
import { recordAudit } from '@/lib/security/audit'
import { revalidatePath } from 'next/cache'
import { defaultTemplates } from '@/lib/templates/defaultTemplates'
import { templateSchema, type TemplateInput } from '@/lib/validations/template.schema'

function refreshTemplates() {
  revalidatePath('/settings')
  revalidatePath('/templates')
  revalidatePath('/prescriptions/new')
}

export async function getTemplates() {
  return withSafeActionError('Template request unavailable. Try again.', async () => {
    const doctor = await getCurrentDoctor()
    if (!doctor) throw new Error('Unauthorized')
    return prisma.diseaseTemplate.findMany({ where: { doctorId: doctor.id }, orderBy: { createdAt: 'desc' } })
  })
}

export async function createTemplate(data: TemplateInput) {
  return withSafeActionError('Template request unavailable. Try again.', async () => {
    const doctor = await getCurrentDoctor()
    if (!doctor) throw new Error('Unauthorized')
    const input = templateSchema.parse(data)
    const result = await prisma.$transaction(async tx => {
      const template = await tx.diseaseTemplate.create({ data: { ...input, doctorId: doctor.id } })
      await recordAudit(doctor.id, 'TEMPLATE_CREATE', template.id, tx)
      return template
    })
    refreshTemplates()
    return result
  })
}

export async function updateTemplate(id: string, data: TemplateInput) {
  return withSafeActionError('Template request unavailable. Try again.', async () => {
    id = recordIdSchema.parse(id)
    const doctor = await getCurrentDoctor()
    if (!doctor) throw new Error('Unauthorized')
    const input = templateSchema.parse(data)
    const result = await prisma.$transaction(async tx => {
      const template = await tx.diseaseTemplate.update({ where: { id, doctorId: doctor.id }, data: input })
      await recordAudit(doctor.id, 'TEMPLATE_UPDATE', template.id, tx)
      return template
    })
    refreshTemplates()
    return result
  })
}

export async function deleteTemplate(id: string) {
  return withSafeActionError('Template request unavailable. Try again.', async () => {
    id = recordIdSchema.parse(id)
    const doctor = await getCurrentDoctor()
    if (!doctor) throw new Error('Unauthorized')
    await prisma.$transaction(async tx => {
      await tx.diseaseTemplate.delete({ where: { id, doctorId: doctor.id } })
      await recordAudit(doctor.id, 'TEMPLATE_DELETE', id, tx)
    })
    refreshTemplates()
    return { success: true }
  })
}

export async function seedDefaultTemplates() {
  return withSafeActionError('Template request unavailable. Try again.', async () => {
    const doctor = await getCurrentDoctor()
    if (!doctor) throw new Error('Unauthorized')
    await prisma.$transaction(async tx => {
      // Serializes repeat clicks and concurrent requests for this doctor only.
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${doctor.id}, 0))::text`
      const existing = await tx.diseaseTemplate.findMany({ where: { doctorId: doctor.id }, select: { id: true, name: true } })
      const names = new Set(existing.map(template => template.name.trim().toLowerCase()))
      for (const template of defaultTemplates) {
        const id = `default_${createHash('sha256').update(`${doctor.id}\0${template.name}`).digest('hex')}`
        if (names.has(template.name.trim().toLowerCase()) || existing.some(item => item.id === id)) continue
        await tx.diseaseTemplate.create({ data: { id, doctorId: doctor.id, ...templateSchema.parse(template) } })
      }
      await recordAudit(doctor.id, 'TEMPLATE_SEED', null, tx)
    })
    refreshTemplates()
  })
}
