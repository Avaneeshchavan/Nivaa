'use server'
import prisma from '@/lib/prisma'
import { getCurrentDoctor } from './auth.actions'
import { draftKeySchema, rxDraftSchema, type RxDraft } from '@/lib/validations/draft.schema'

async function requireOwner(patientId: string | null) {
  const doctor = await getCurrentDoctor()
  if (!doctor) throw new Error('Unauthorized')
  if (patientId && !await prisma.patient.findFirst({ where: { id: patientId, doctorId: doctor.id }, select: { id: true } })) throw new Error('Patient unavailable')
  return doctor
}
export async function getRxDraft(key: string): Promise<RxDraft | null> {
  key = draftKeySchema.parse(key)
  const doctor = await requireOwner(null)
  const draft = await prisma.rxDraft.findUnique({ where: { doctorId_key: { doctorId: doctor.id, key } } })
  if (!draft) return null
  const parsed = rxDraftSchema.safeParse(draft.payload)
  if (!parsed.success) return null
  await requireOwner(parsed.data.patientId)
  return parsed.data
}
export async function saveRxDraft(key: string, data: RxDraft) {
  key = draftKeySchema.parse(key)
  const payload = rxDraftSchema.parse(data)
  const doctor = await requireOwner(payload.patientId)
  await prisma.rxDraft.upsert({ where: { doctorId_key: { doctorId: doctor.id, key } }, create: { doctorId: doctor.id, key, payload }, update: { payload } })
}
export async function deleteRxDraft(key: string) {
  key = draftKeySchema.parse(key)
  const doctor = await requireOwner(null)
  await prisma.rxDraft.deleteMany({ where: { doctorId: doctor.id, key } })
}
