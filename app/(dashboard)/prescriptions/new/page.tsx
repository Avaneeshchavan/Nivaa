import { getRxDraft } from '@/actions/drafts.actions'
import RxBuilder from '@/components/prescriptions/RxBuilder'
import HeaderSetter from '@/components/dashboard/HeaderSetter'
import prisma from '@/lib/prisma'
import { prescriptionPatientSelect } from '@/lib/prescription-patient'
import { getCurrentDoctor } from '@/actions/auth.actions'
import { getPrescriptionForDuplicate } from '@/actions/prescriptions.actions'
import { redirect, notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function NewPrescriptionPage({ searchParams }: {
  searchParams: Promise<{ patientId?: string; duplicateId?: string }>
}) {
  const [doctor, { patientId, duplicateId }] = await Promise.all([getCurrentDoctor(), searchParams])
  if (!doctor) redirect('/login')
  const draftKey = duplicateId ? `duplicate_${duplicateId}` : patientId ? `patient_${patientId}` : 'new'
  const [savedDraft, duplicate, templates] = await Promise.all([
    getRxDraft(draftKey),
    duplicateId ? getPrescriptionForDuplicate(duplicateId) : null,
    prisma.diseaseTemplate.findMany({ where: { doctorId: doctor.id }, orderBy: { name: 'asc' } }),
  ])
  if (duplicateId && !duplicate) notFound()
  const requestedId = savedDraft?.patientId || duplicate?.patientId || patientId
  const patients = requestedId ? await prisma.patient.findMany({
    where: { id: requestedId, doctorId: doctor.id }, select: prescriptionPatientSelect,
  }) : []
  const initialPatientId = patients[0]?.id

  return <>
    <HeaderSetter title="New prescription" />
    <RxBuilder key={duplicateId || patientId || 'new'} draftKey={draftKey} savedDraft={savedDraft}
      doctor={doctor} allowPatientChange={!patientId && !duplicateId} duplicate={duplicate} initialPatientId={initialPatientId}
      patients={patients} templates={templates} />
  </>
}
