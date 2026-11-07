'use server'

import { recordIdSchema } from '@/lib/validations/id.schema'

import { recordAudit } from '@/lib/security/audit'
import { consumeRateLimit } from '@/lib/security/rate-limit'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { getCurrentDoctor } from './auth.actions'
import { createClient } from '@/lib/supabase/server'
import prisma from '@/lib/prisma'
import { handwritingSchema } from '@/lib/validations/handwriting.schema'

export async function uploadHandwritingPhoto(formData: FormData) {
  const doctor = await getCurrentDoctor()
  if (!doctor) throw new Error('Unauthorized')
  const file = formData.get('photo')
  if (!(file instanceof File) || file.size === 0 || file.size > 750000 || file.type !== 'image/jpeg') {
    throw new Error('Choose a JPEG photo under 750 KB')
  }
  const bytes = Buffer.from(await file.arrayBuffer())
  if (bytes[0] !== 255 || bytes[1] !== 216 || bytes[2] !== 255) throw new Error('Invalid JPEG photo')
  if (!await consumeRateLimit('upload', doctor.id, 30, 600)) throw new Error('Too many uploads. Try again in a few minutes.')
  const photoId = randomUUID()
  const supabase = await createClient()
  const { error } = await supabase.storage.from('prescription-notes').upload(`${doctor.supabaseId}/${photoId}.jpg`, bytes, {
    contentType: 'image/jpeg', cacheControl: '0', upsert: false,
  })
  if (error) throw new Error('Photo could not be uploaded. Try again.')
  await recordAudit(doctor.id, 'NOTE_PHOTO_UPLOAD', photoId)
  return photoId
}

export async function getPrescriptionNotes(id: string) {
  id = recordIdSchema.parse(id)
  const doctor = await getCurrentDoctor()
  if (!doctor) throw new Error('Unauthorized')
  const prescription = await prisma.prescription.findFirst({
    where: { id, doctorId: doctor.id, patient: { doctorId: doctor.id } },
    select: { id: true, patientId: true, notes: true, handwriting: true, updatedAt: true, createdAt: true, patient: { select: { name: true } } },
  })
  if (prescription) await recordAudit(doctor.id, 'PRESCRIPTION_NOTES_VIEW', prescription.id)
  return prescription
}

const notesUpdateSchema = z.object({
  id: z.string().min(1).max(100),
  expectedUpdatedAt: z.iso.datetime(),
  notes: z.string().max(8000),
  handwriting: handwritingSchema,
})

export async function updatePrescriptionNotes(input: z.input<typeof notesUpdateSchema>) {
  const doctor = await getCurrentDoctor()
  if (!doctor) throw new Error('Unauthorized')
  const data = notesUpdateSchema.parse(input)
  // Ownership and optimistic locking are checked in the same write.
  const result = await prisma.$transaction(async tx => {
    const result = await tx.prescription.updateMany({
      where: { id: data.id, doctorId: doctor.id, patient: { doctorId: doctor.id }, updatedAt: new Date(data.expectedUpdatedAt) },
      data: { notes: data.notes, handwriting: data.handwriting },
    })
    if (result.count === 1) await recordAudit(doctor.id, 'PRESCRIPTION_NOTES_UPDATE', data.id, tx)
    return result
  })
  if (result.count !== 1) return { success: false as const }
  revalidatePath(`/prescriptions/${data.id}/notes`)
  return { success: true as const }
}
