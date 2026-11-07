import { notFound } from 'next/navigation'
import { getPrescriptionNotes } from '@/actions/handwriting.actions'
import { parseHandwriting } from '@/lib/validations/handwriting.schema'
import PrescriptionNotesForm from '@/components/prescriptions/PrescriptionNotesForm'
import HeaderSetter from '@/components/dashboard/HeaderSetter'

export default async function PrescriptionNotesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const rx = await getPrescriptionNotes(id)
  if (!rx) notFound()
  return <div className="mx-auto max-w-4xl space-y-5">
    <HeaderSetter title="Prescription notes" />
    <div><p className="clinic-kicker mb-2">Prescription notes</p><h1 className="clinic-heading">{rx.patient.name}</h1>
      <p className="mt-2 text-muted-foreground">{rx.createdAt.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium' })}</p></div>
    <PrescriptionNotesForm id={rx.id} patientId={rx.patientId} expectedUpdatedAt={rx.updatedAt.toISOString()} initialNotes={rx.notes || ''} initialHandwriting={parseHandwriting(rx.handwriting)} />
  </div>
}
