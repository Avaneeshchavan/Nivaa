'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button, buttonVariants } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import HandwritingEditor from './HandwritingEditor'
import { updatePrescriptionNotes } from '@/actions/handwriting.actions'
import type { Handwriting } from '@/lib/validations/handwriting.schema'

export default function PrescriptionNotesForm({ id, patientId, expectedUpdatedAt, initialNotes, initialHandwriting }: {
  id: string; patientId: string; expectedUpdatedAt: string; initialNotes: string; initialHandwriting: Handwriting
}) {
  const router = useRouter()
  const [notes, setNotes] = useState(initialNotes)
  const [handwriting, setHandwriting] = useState(initialHandwriting)
  const [busy, setBusy] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const save = async () => {
    setSaving(true)
    setError('')
    try {
      const result = await updatePrescriptionNotes({ id, expectedUpdatedAt, notes, handwriting })
      if (!result.success) { setError('This prescription has changed in another tab. Copy your new text, reload this page, and review before saving.'); return }
      router.push(`/patients/${patientId}`)
    } catch { setError('Notes could not be saved. Keep this page open and try again.') }
    finally { setSaving(false) }
  }
  return <div className="clinic-panel space-y-5 p-4 sm:p-6">
    <p className="text-muted-foreground">Add advice or handwritten details to this saved prescription.</p>
    <label htmlFor="saved-rx-notes" className="block font-semibold">Notes and advice</label>
    <Textarea id="saved-rx-notes" value={notes} maxLength={8000} disabled={saving} onChange={event => setNotes(event.target.value)} />
    <h2 className="text-lg font-semibold">Handwritten notes</h2>
    <HandwritingEditor value={handwriting} onChange={setHandwriting} disabled={saving} onBusyChange={setBusy} />
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-900">{error}</p>}
    <div className="flex flex-wrap gap-2">
      <Button onClick={save} disabled={saving || busy}>{saving ? 'Saving…' : 'Save notes'}</Button>
      <Link className={buttonVariants({ variant: 'outline' })} href={`/patients/${patientId}`}>Back to patient</Link>
    </div>
  </div>
}
