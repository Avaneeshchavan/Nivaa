import { getRxDraftEnvelope } from '@/actions/drafts.actions'
import { getRxWorkflowSupport } from '@/actions/rx-workflow.actions'
import RxBuilder from '@/components/prescriptions/RxBuilder'
import HeaderSetter from '@/components/dashboard/HeaderSetter'
import prisma from '@/lib/prisma'
import { prescriptionPatientSelect } from '@/lib/prescription-patient'
import { getCurrentDoctor } from '@/actions/auth.actions'
import { getPrescriptionForDuplicate, getLastPrescriptionForRepeat } from '@/actions/prescriptions.actions'
import { redirect, notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function NewPrescriptionPage({ searchParams }: {
  searchParams: Promise<{ patientId?: string; duplicateId?: string; repeat?: string }>
}) {
  const [doctor, { patientId, duplicateId, repeat }] = await Promise.all([getCurrentDoctor(), searchParams])
  if (!doctor) redirect('/login')
  const duplicate = duplicateId ? await getPrescriptionForDuplicate(duplicateId)
    : repeat === '1' && patientId ? await getLastPrescriptionForRepeat(patientId) : null
  if (duplicateId && !duplicate) notFound()
  if (patientId && duplicate && duplicate.patientId !== patientId) notFound()
  const draftKey = duplicate ? `duplicate_${duplicate.sourceId}` : patientId ? `patient_${patientId}` : 'new'
  const [loadedDraft, templates, support] = await Promise.all([
    getRxDraftEnvelope(draftKey),
    prisma.diseaseTemplate.findMany({ where: { doctorId: doctor.id }, orderBy: { name: 'asc' } }),
    getRxWorkflowSupport(),
  ])
  const expectedId = duplicate?.patientId || patientId
  const cloudDraft = expectedId && loadedDraft?.payload.patientId !== expectedId ? null : loadedDraft
  const requestedId = expectedId || cloudDraft?.payload.patientId
  const patients = requestedId ? await prisma.patient.findMany({
    where: { id: requestedId, doctorId: doctor.id }, select: prescriptionPatientSelect,
  }) : []
  if (requestedId && !patients.length) notFound()
  const initialPatientId = patients[0]?.id

  return <>
    <HeaderSetter title="New prescription" />
    <RxBuilder key={`${doctor.id}:${duplicateId || patientId || 'new'}:${repeat || ''}`} draftKey={draftKey} cloudDraft={cloudDraft} support={support}
      doctor={doctor} allowPatientChange={!patientId && !duplicateId} duplicate={duplicate} initialPatientId={initialPatientId}
      repeatRequested={repeat === '1'} patients={patients} templates={templates} />
  </>
}
