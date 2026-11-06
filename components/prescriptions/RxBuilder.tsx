'use client'

import { useRxAutosave } from './useRxAutosave'
import type { RxDraft } from '@/lib/validations/draft.schema'
import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useRxBuilderStore } from '@/stores/rxBuilderStore'
import { createPrescription } from '@/actions/prescriptions.actions'
import { DiseaseTemplate, Patient, Doctor } from '@/lib/generated/prisma/client'
import DiseaseTemplateSelector from './DiseaseTemplateSelector'
import MedicineAutocomplete from './MedicineAutocomplete'
import RxPreview from './RxPreview'
import VisitFields from './VisitFields'
import AllergiesBanner from '@/components/patients/AllergiesBanner'
import { emptyVisitForm, visitFormSchema } from '@/lib/validations/visit.schema'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import Toast from '@/components/ui/Toast'
import type { DuplicateRxDraft } from '@/lib/validations/prescription.schema'
import { ChevronDown, Printer, Save, UserRound } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface RxBuilderProps {
  draftKey: string
  savedDraft: RxDraft | null
  doctor: Doctor
  assets: { logoUrl?: string; signatureUrl?: string }
  duplicate?: DuplicateRxDraft | null
  initialPatientId?: string
  patients: Patient[]
  templates: DiseaseTemplate[]
}

export default function RxBuilder({ initialPatientId, patients, templates, duplicate, doctor, assets, draftKey, savedDraft }: RxBuilderProps) {
  const router = useRouter()
  const {
    visit, setVisit,
    patientId, setPatientId,
    diagnosis, setDiagnosis,
    medicines, notes, setNotes,
    reset
  } = useRxBuilderStore()

  const [paperSize, setPaperSize] = useState<'A4' | 'A5'>('A5')
  const [saving, setSaving] = useState(false)
  const [visitError, setVisitError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [visitOpen, setVisitOpen] = useState(false)
  const selectedPatient = patients.find(p => p.id === patientId)

  const [toast, setToast] = useState('')
  const [editingMedicine, setEditingMedicine] = useState<string | null>(null)
  const dismissToast = useCallback(() => setToast(''), [])

  useEffect(() => {
    useRxBuilderStore.setState({
      patientId: initialPatientId || null,
      diagnosis: duplicate?.diagnosis || '',
      notes: duplicate?.notes || '',
      medicines: duplicate?.medicines.map(m => ({ ...m, id: crypto.randomUUID() })) || [],
      templateId: null,
      visit: { ...emptyVisitForm },
      ...(savedDraft || {}),
    })
    if (savedDraft) setToast('Draft restored. Review before saving.')
    else if (duplicate) setToast('Prescription copied for today. Review and save as a new Rx.')

  }, [initialPatientId, duplicate, reset, savedDraft])

  const autosave = useRxAutosave(draftKey)

  const handleSave = async (print: boolean) => {
    if (!patientId) {
      setSaveError('Select a patient before saving.')
      return
    }

    const measurements = visitFormSchema.safeParse(visit)
    if (!measurements.success) {
      setVisitOpen(true)
      setVisitError(measurements.error.issues.map(issue => `${String(issue.path[0])}: ${issue.message}`).join(' · '))
      return
    }
    setVisitError('')
    setSaveError('')
    setSaving(true)
    const printTab = print ? window.open('about:blank', '_blank') : null
    if (printTab) printTab.opener = null
    try {
      const rx = await createPrescription({
        patientId,
        diagnosis,
        medicines,
        visit: measurements.data,
        notes
      })

      try { await autosave.complete() } catch { setToast('Prescription saved; old draft could not be cleared.') }
      if (print) {
        const pdfUrl = `/api/prescriptions/${rx.id}/pdf?size=${paperSize}`
        if (printTab) printTab.location.replace(pdfUrl)
        else { window.location.assign(pdfUrl); return }
      }

      router.push(`/patients/${patientId}`)
    } catch {
      printTab?.close()
      setSaveError('The prescription could not be saved. Check the entries and try again.')
      setSaving(false)
    }
  }

  const canSave = Boolean(patientId && (diagnosis.trim() || medicines.length) && !saving)

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="clinic-kicker mb-2">Prescriptions</p>
          <h1 className="clinic-heading">New prescription</h1>
        </div>
        <p role="status" className="text-sm font-medium text-muted-foreground">{autosave.status}</p>
      </div>
      {toast && <Toast message={toast} onDismiss={dismissToast} />}

      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-5">
          <section className="clinic-panel p-4 sm:p-5" aria-labelledby="rx-patient-heading">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-secondary text-primary"><UserRound aria-hidden="true" className="size-5" /></span>
                <div className="min-w-0"><h2 id="rx-patient-heading" className="text-lg font-semibold break-words">{selectedPatient?.name || 'Choose a patient'}</h2>
                <p className="text-sm text-muted-foreground">{new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium' })}</p></div>
              </div>
              {!initialPatientId && (
                <Select value={patientId || undefined} onValueChange={setPatientId}>
                  <SelectTrigger aria-label="Choose patient" className="w-full sm:max-w-xs"><SelectValue placeholder="Select patient" /></SelectTrigger>
                  <SelectContent>
                    {patients.map(p => <SelectItem key={p.id} value={p.id}>{p.name}{p.phone ? ` · ${p.phone}` : ''}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </div>
            {selectedPatient?.allergies && <div className="mt-4"><AllergiesBanner allergies={selectedPatient.allergies} /></div>}
          </section>

          <section className="clinic-panel space-y-4 p-4 sm:p-5">
            <label htmlFor="rx-diagnosis" className="block text-lg font-semibold">Diagnosis</label>
            <Input id="rx-diagnosis" value={diagnosis} onChange={event => setDiagnosis(event.target.value)} placeholder="Enter a diagnosis" />
            <DiseaseTemplateSelector templates={templates} />
          </section>

          <section className="clinic-panel space-y-4 p-4 sm:p-5" aria-labelledby="rx-medicines-heading">
            <div className="flex items-center justify-between gap-3">
              <h2 id="rx-medicines-heading" className="text-lg font-semibold">Medicines</h2>
              <span className="rounded-full bg-secondary px-3 py-1 text-sm font-medium text-secondary-foreground">{medicines.length} added</span>
            </div>
            <MedicineAutocomplete />
          <div className="space-y-3">
            {medicines.map((med, idx) => (
              <div key={med.id} className="bg-muted/60 p-4 rounded-xl border flex flex-wrap justify-between items-start gap-4 animate-in slide-in-from-bottom-2">
                <div className="flex-1">
                  <h4 className="font-semibold text-foreground">{idx + 1}. {med.name}</h4>
                  <div className="text-sm text-muted-foreground flex flex-wrap gap-x-3 mt-1">
                    <span>{med.dosage}</span>
                    <span>•</span>
                    <span>{med.frequency}</span>
                    <span>•</span>
                    <span>{med.duration}</span>
                  </div>
                </div>
                <Button variant="outline" className="min-h-11" onClick={() => setEditingMedicine(editingMedicine === med.id ? null : med.id)}>
                  {editingMedicine === med.id ? 'Done' : 'Edit'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="min-h-11 text-red-800 hover:text-red-700 hover:bg-red-50"
                  onClick={() => useRxBuilderStore.getState().removeMedicine(med.id)}
                >
                  Remove
                </Button>
                {editingMedicine === med.id && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                    {(['name', 'dosage', 'frequency', 'duration', 'instructions'] as const).map(field => (
                      <label key={field} className="text-sm capitalize">{field}
                        <Input className="h-12 mt-1" value={med[field]} onChange={e => useRxBuilderStore.getState().updateMedicine(med.id, { [field]: e.target.value })} />
                      </label>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          </section>

          <details className="clinic-panel group" open={visitOpen} onToggle={event => setVisitOpen(event.currentTarget.open)}>
            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-2 rounded-2xl px-4 sm:px-5">
              <span className="text-lg font-semibold">Visit measurements <span className="text-sm font-normal text-muted-foreground">· Optional</span></span>
              <ChevronDown aria-hidden="true" className="size-5 shrink-0 group-open:rotate-180" />
            </summary>
            <div className="border-t p-4 sm:p-5"><VisitFields value={visit} onChange={value => { setVisit(value); setVisitError('') }} />
              {visitError && <p role="alert" className="mt-3 text-red-900">{visitError}</p>}
            </div>
          </details>

          <section className="clinic-panel space-y-3 p-4 sm:p-5">
            <label htmlFor="rx-notes" className="block text-lg font-semibold">Notes and advice</label>
            <Textarea id="rx-notes" value={notes} onChange={event => setNotes(event.target.value)} placeholder="Instructions or follow-up advice" className="min-h-24" />
          </section>

          <div className="sticky bottom-0 z-20 space-y-2 rounded-2xl border bg-card p-3 shadow-md">
            {saveError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-900">{saveError}</p>}
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex min-h-11 items-center gap-2 font-medium">Paper
                <select className="min-h-11 rounded-lg border border-input bg-card px-2" value={paperSize} onChange={event => setPaperSize(event.target.value === 'A4' ? 'A4' : 'A5')}><option>A5</option><option>A4</option></select>
              </label>
              <Button variant="outline" className="flex-1" onClick={() => handleSave(false)} disabled={!canSave}><Save aria-hidden="true" />Save Rx</Button>
              <Button className="flex-1" onClick={() => handleSave(true)} disabled={!canSave}><Printer aria-hidden="true" />{saving ? 'Saving…' : 'Save and print'}</Button>
            </div>
          </div>
        </div>

        <div className="min-w-0">
          <RxPreview patient={selectedPatient} doctor={doctor} assets={assets} paperSize={paperSize} />
        </div>
      </div>
    </div>
  )
}
