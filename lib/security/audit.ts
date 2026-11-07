import prisma from '@/lib/prisma'
import type { Prisma } from '@/lib/generated/prisma/client'

type AuditAction = 'LOGIN' | 'LOGOUT' | 'PROFILE_UPDATE' | 'PATIENT_VIEW' | 'PATIENT_CREATE' | 'PATIENT_UPDATE' |
  'PRESCRIPTION_CREATE' | 'PRESCRIPTION_COPY' | 'PRESCRIPTION_NOTES_VIEW' | 'PRESCRIPTION_NOTES_UPDATE' | 'PDF_VIEW' |
  'TEMPLATE_CREATE' | 'TEMPLATE_UPDATE' | 'TEMPLATE_DELETE' | 'TEMPLATE_SEED' | 'SIGNATURE_UPLOAD' | 'NOTE_PHOTO_UPLOAD'

// Event metadata only. Clinical content, searches, names and credentials have no column here.
export async function recordAudit(doctorId: string, action: AuditAction, resourceId: string | null = null,
  client: Pick<Prisma.TransactionClient, 'auditLog'> = prisma) {
  await client.auditLog.create({ data: { doctorId, action, resourceId } })
}
