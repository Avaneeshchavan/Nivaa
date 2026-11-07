'use client'

import { useRxAutosave } from './useRxAutosave'
import { rxSaveReason } from '@/lib/prescriptions/save-state'
import { reserveScrollSpace } from '@/lib/prescriptions/scroll-reservation'
import type { RxDraft } from '@/lib/validations/draft.schema'
import type { CloudDraft } from '@/lib/rx/local-drafts'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useRxBuilderStore } from '@/stores/rxBuilderStore'
import { createPrescription, getLastPrescriptionForRepeat } from '@/actions/prescriptions.actions'
import type { PrescriptionPatient } from '@/lib/prescription-patient'
import { emptyHandwriting } from '@/lib/validations/handwriting.schema'
import dynamic from 'next/dynamic'
import PatientPicker from './PatientPicker'
import type { DiseaseTemplate, Doctor } from '@/lib/generated/prisma/client'
import PatientStrip from './PatientStrip'
import { emptyVisitForm, visitFormSchema } from '@/lib/validations/visit.schema'
import { Button } from '@/components/ui/button'
import Toast from '@/components/ui/Toast'
import type { DuplicateRxDraft } from '@/lib/validations/prescription.schema'
import { rxMetric } from '@/lib/rx/metrics'
import DevRxProfiler from './DevRxProfiler'
import AdviceLibrary from './AdviceLibrary'
import { ActionBar, DiagnosisPanel, HandwritingPanel, HistoryControls, MedicinesPanel, MeasurementsPanel, type WorkflowSupport } from './RxSections'
const AdvicePanel = memo(AdviceLibrary)
const RxPreview = dynamic(() => import('./RxPreview'), { ssr: false, loading: () => <p role="status">Loading print preview…</p> })
interface RxBuilderProps {
  draftKey: string; cloudDraft: CloudDraft; doctor: Doctor; support: WorkflowSupport
  duplicate?: DuplicateRxDraft | null; repeatRequested?: boolean; allowPatientChange?: boolean
  initialPatientId?: string; patients: PrescriptionPatient[]; templates: DiseaseTemplate[]
}
function RxBuilderContent({ allowPatientChange, initialPatientId, patients, templates, support, duplicate, repeatRequested, doctor, draftKey, cloudDraft }: RxBuilderProps) {
  const router = useRouter(), patientStripRef = useRef<HTMLDivElement>(null)
  const patientId = useRxBuilderStore(s => s.patientId)
  const [previewEnabled, setPreviewEnabled] = useState(false), [handwritingBusy, setHandwritingBusy] = useState(false)
  const [paperSize, setPaperSize] = useState<'A4' | 'A5'>('A5'), [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(''), [copyConfirmed, setCopyConfirmed] = useState(!duplicate)
  const [repeatBusy, setRepeatBusy] = useState(false)
  const [toast, setToast] = useState(''), [toastAction, setToastAction] = useState<{ label: string; onClick: () => void } | undefined>()
  const dismissToast = useCallback(() => { setToast(''); setToastAction(undefined) }, [])
  const seed = useMemo<RxDraft>(() => ({ patientId: initialPatientId || null, diagnosis: duplicate?.diagnosis || '', notes: duplicate?.notes || '', medicines: duplicate?.medicines.map(m => ({ ...m, id: crypto.randomUUID() })) || [], handwriting: emptyHandwriting, visit: emptyVisitForm, templateId: null, followUpDate: '' }), [initialPatientId, duplicate])
  const metadata = useRef<PrescriptionPatient[]>(patients)
  const autosave = useRxAutosave({ doctorId: doctor.id, key: draftKey, initialPatientId, seed, cloud: cloudDraft, patientFor: id => metadata.current.find(p => p.id === id) })
  const selectedPatient = [...patients, autosave.restoredPatient].find(p => p?.id === patientId) || undefined
  metadata.current = [...patients, ...(autosave.restoredPatient ? [autosave.restoredPatient] : [])]
  useEffect(() => {
    if (!autosave.ready || !patientStripRef.current) return
    return reserveScrollSpace(patientStripRef.current, '--rx-patient-strip-height')
  }, [autosave.ready])
  const removed = useCallback((restore: () => void) => {
    const owner = useRxBuilderStore.getState().patientId
    setToast('Medicine removed.'); setToastAction({ label: 'Undo', onClick: () => { if (useRxBuilderStore.getState().patientId === owner) restore() } })
  }, [])
  const repeat = async () => {
    if (!patientId || repeatBusy || saving || handwritingBusy) return
    setRepeatBusy(true)
    try {
      const previous = await getLastPrescriptionForRepeat(patientId)
      if (!previous) { setToast('No previous prescription for this patient.'); return }
      if (useRxBuilderStore.getState().patientId !== previous.patientId) return
      if (!window.confirm('Copy the last prescription for today? This replaces medicines, diagnosis and advice. Measurements and handwriting will be cleared. Review before saving.')) return
      useRxBuilderStore.getState().replaceContent({ diagnosis: previous.diagnosis, notes: previous.notes, medicines: previous.medicines.map(m => ({ ...m, id: crypto.randomUUID() })), visit: emptyVisitForm, handwriting: emptyHandwriting, followUpDate: '', templateId: null })
      setCopyConfirmed(true); setToastAction(undefined); setToast('Last prescription copied for today. Review before saving.')
    } catch { setToast('Previous prescription could not be loaded. Try again.') } finally { setRepeatBusy(false) }
  }
  const handleSave = async (print: boolean) => {
    const state = useRxBuilderStore.getState()
    if (!copyConfirmed || saving) return
    const reason = rxSaveReason({ ...state, saving, handwritingBusy })
    if (reason) { setSaveError(reason); return }
    if (!state.patientId) return
    const measurements = visitFormSchema.safeParse(state.visit)
    if (!measurements.success) return
    setSaveError(''); setSaving(true)
    const printTab = print ? window.open('about:blank', '_blank') : null
    if (printTab) printTab.opener = null
    const saveStarted = performance.now()
    try {
      const rx = await createPrescription({ patientId: state.patientId, diagnosis: state.diagnosis, medicines: state.medicines, visit: measurements.data, notes: state.notes, handwriting: state.handwriting, followUpDate: state.followUpDate })
      rxMetric('save-action-round-trip', performance.now() - saveStarted)
      try { await autosave.complete() } catch { setToast('Prescription saved; old draft could not be cleared.') }
      rxMetric('save-and-draft-cleanup', performance.now() - saveStarted)
      if (print) { const url = `/api/prescriptions/${rx.id}/pdf?size=${paperSize}`; if (printTab) printTab.location.replace(url); else { window.location.assign(url); return } }
      router.push(`/patients/${state.patientId}`)
    } catch { printTab?.close(); setSaveError('The prescription could not be saved. Your draft is retained; check the connection and try again.'); setSaving(false) }
  }
  if (!autosave.ready) return <div role="status" className="clinic-panel p-5">{autosave.status}</div>
  return <div data-rx-builder className="space-y-5">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="clinic-kicker mb-2">Prescriptions</p><h1 className="clinic-heading">New prescription</h1></div><p role="status" className="text-sm font-medium text-muted-foreground">{autosave.status}</p></div>
    {toast && <Toast message={toast} onDismiss={dismissToast} action={toastAction} />}
    {duplicate && !copyConfirmed && <section className="clinic-panel space-y-3 border-amber-500 p-4" role="region" aria-label="Confirm copied prescription"><p>Copied for today. Review medicines, diagnosis and advice for this patient before using them.</p><Button type="button" onClick={() => { setCopyConfirmed(true); setToast('Copy confirmed. Review and save as a new Rx.') }}>Confirm copied Rx</Button></section>}
    {repeatRequested && !duplicate && <p role="status">No previous prescription found. Start a new prescription below.</p>}
    {autosave.patientFromDevice && <p role="status" className="rounded-lg border border-amber-500 bg-amber-50 p-3 text-amber-950">Patient details restored from this device. Verify identity and allergies before saving.</p>}
    <div ref={patientStripRef} className={`sticky top-0 z-30 bg-background pb-2 ${previewEnabled ? '' : 'max-w-4xl'}`}><PatientStrip patient={selectedPatient} /></div>
    <fieldset disabled={saving} aria-busy={saving} className="contents"><legend className="sr-only">Prescription editor</legend><div className={`grid min-w-0 gap-5 ${previewEnabled ? 'xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]' : 'max-w-4xl'}`}><div className="min-w-0 space-y-5">
      {allowPatientChange && <section className="clinic-panel p-4 sm:p-5" aria-label="Choose prescription patient"><PatientPicker onSelect={patient => {
        if (handwritingBusy || saving || repeatBusy) return
        const state = useRxBuilderStore.getState(), hasEntries = state.diagnosis.trim() || state.medicines.length || state.notes.trim() || state.handwriting.strokes.length || state.handwriting.photoId || Object.values(state.visit).some(v => v.trim())
        if (patient.id === state.patientId) return
        if (hasEntries && !window.confirm('Open this patient’s draft? Current entries stay in their existing draft.')) return
        // Open the target draft before writing anything under its patient key.
        router.push(`/prescriptions/new?patientId=${encodeURIComponent(patient.id)}`)
      }} /></section>}
      <div className="flex flex-wrap justify-between gap-2"><HistoryControls /><Button type="button" variant="outline" disabled={!patientId || repeatBusy || saving || handwritingBusy} onClick={repeat}>{repeatBusy ? 'Loading last Rx…' : 'Repeat last Rx'}</Button></div>
      <DiagnosisPanel templates={templates} support={support} />
      <MedicinesPanel doctorId={doctor.id} instructions={support.instructions} onRemoved={removed} />
      <MeasurementsPanel />
      <AdvicePanel initial={support.advice} />
      <HandwritingPanel saving={saving} onBusyChange={setHandwritingBusy} />
      <Button type="button" variant="outline" onClick={() => setPreviewEnabled(v => !v)}>{previewEnabled ? 'Hide print preview' : 'Show print preview'}</Button>
      <ActionBar saving={saving} handwritingBusy={handwritingBusy} confirmed={copyConfirmed} saveError={saveError} paperSize={paperSize} onPaperSize={setPaperSize} onSave={handleSave} />
    </div><div className="min-w-0">{previewEnabled && <RxPreview patient={selectedPatient} doctor={doctor} paperSize={paperSize} />}</div></div></fieldset>
  </div>
}

export default function RxBuilder(props: RxBuilderProps) {
  return <DevRxProfiler><RxBuilderContent {...props} /></DevRxProfiler>
}
