import { getRxDraft } from '@/actions/drafts.actions'
import { getPdfAssets } from '@/lib/pdf-assets'
import RxBuilder from '@/components/prescriptions/RxBuilder'
import HeaderSetter from '@/components/dashboard/HeaderSetter'
import prisma from '@/lib/prisma'
import { getCurrentDoctor } from '@/actions/auth.actions'
import { getPrescriptionForDuplicate } from '@/actions/prescriptions.actions'
import { redirect, notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function NewPrescriptionPage({
  searchParams,
}: {
  searchParams: Promise<{ patientId?: string; duplicateId?: string }>
}) {
  const doctor = await getCurrentDoctor()
  if (!doctor) redirect('/login')

  const assets = await getPdfAssets(doctor)
  const { patientId, duplicateId } = await searchParams
  const draftKey = duplicateId ? `duplicate_${duplicateId}` : patientId ? `patient_${patientId}` : 'new'
  const savedDraft = await getRxDraft(draftKey)
  const duplicate = duplicateId ? await getPrescriptionForDuplicate(duplicateId) : null
  if (duplicateId && !duplicate) notFound()

  const patients = await prisma.patient.findMany({
    where: { doctorId: doctor.id },
    orderBy: { name: 'asc' },
  })

  const templates = await prisma.diseaseTemplate.findMany({
    where: { doctorId: doctor.id },
    orderBy: { name: 'asc' },
  })

  // If a patientId is provided in URL, verify they exist and belong to the doctor
  let initialPatientId = duplicate?.patientId || patientId
  if (initialPatientId) {
    const valid = patients.some(p => p.id === initialPatientId)
    if (!valid) initialPatientId = undefined
  }

  return (
    <>
      <HeaderSetter title="New Prescription" />
      <div className="h-full">
        <RxBuilder
          key={duplicateId || patientId || 'new'}
          draftKey={draftKey}
          savedDraft={savedDraft}
          doctor={doctor}
          assets={assets}
          duplicate={duplicate}
          initialPatientId={initialPatientId} 
          patients={patients} 
          templates={templates} 
        />
      </div>
    </>
  )
}
