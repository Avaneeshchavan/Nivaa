'use client'

import { memo, useRef, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useRxBuilderStore } from '@/stores/rxBuilderStore'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { rxSaveReason } from '@/lib/prescriptions/save-state'
import type { DiseaseTemplate } from '@/lib/generated/prisma/client'
import type { getRxWorkflowSupport } from '@/actions/rx-workflow.actions'
import { reserveScrollSpace } from '@/lib/prescriptions/scroll-reservation'
import { useEffect } from 'react'
import DiseaseTemplateSelector from './DiseaseTemplateSelector'
import MedicineAutocomplete from './MedicineAutocomplete'
import DoseFields, { blankDose } from './DoseFields'
import VisitFields from './VisitFields'
import HandwritingEditor from './HandwritingEditor'
import { ChevronDown, GripVertical, Printer, Save } from 'lucide-react'
export type WorkflowSupport = Awaited<ReturnType<typeof getRxWorkflowSupport>>
const builtinDiagnoses = ['Fever', 'Cough', 'Headache', 'Abdominal pain', 'Hypertension', 'Type 2 diabetes mellitus', 'Acute upper respiratory infection', 'Follow-up visit']

export const DiagnosisPanel = memo(function DiagnosisPanel({ templates, support }: { templates: DiseaseTemplate[]; support: WorkflowSupport }) {
  const diagnosis = useRxBuilderStore(s => s.diagnosis)
  return <section className="clinic-panel space-y-4 p-4 sm:p-5">
    <label htmlFor="rx-diagnosis" className="block text-lg font-semibold">Diagnosis / complaints</label>
    <Input id="rx-diagnosis" maxLength={4000} list="rx-diagnoses" value={diagnosis} onChange={e => useRxBuilderStore.getState().setDiagnosis(e.target.value)} placeholder="Enter or choose a diagnosis" />
    <datalist id="rx-diagnoses">{[...new Set([...support.diagnoses, ...builtinDiagnoses])].map(text => <option key={text} value={text} />)}</datalist>
    <DiseaseTemplateSelector templates={templates} preferences={support.preferences} />
  </section>
})

const MedicineRow = memo(function MedicineRow({ id, index, count, instructions, onRemoved }: { id: string; index: number; count: number; instructions: string[]; onRemoved: (restore: () => void) => void }) {
  const medicine = useRxBuilderStore(s => s.medicines.find(m => m.id === id))
  const [editing, setEditing] = useState(false), [dragging, setDragging] = useState(false)
  const target = useRef(index)
  if (!medicine) return null
  const move = (next: number) => useRxBuilderStore.getState().moveMedicine(id, next)
  return <article data-rx-row={index} className={`rounded-xl border bg-muted/50 p-4 ${dragging ? 'ring-2 ring-primary' : ''}`}>
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" variant="outline" className="touch-none" aria-label={`Reorder ${medicine.name}. Use arrow up or down.`}
        onPointerDown={e => { target.current = index; e.currentTarget.setPointerCapture(e.pointerId); setDragging(true) }}
        onPointerMove={e => { if (!e.currentTarget.hasPointerCapture(e.pointerId)) return; const row = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-rx-row]'); if (row) target.current = Number(row.getAttribute('data-rx-row')) }}
        onPointerUp={e => { if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId); setDragging(false); if (target.current !== index) move(target.current) }}
        onPointerCancel={() => setDragging(false)}
        onKeyDown={e => { if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); move(index + (e.key === 'ArrowUp' ? -1 : 1)) } }}><GripVertical aria-hidden="true" /></Button>
      <div className="min-w-0 flex-1"><h3 className="break-words font-semibold">{index + 1}. {medicine.name}</h3><p className="text-sm text-muted-foreground">{medicine.dosage} · {medicine.frequency} · {medicine.duration}</p></div>
      <Button type="button" variant="outline" onClick={() => setEditing(!editing)}>{editing ? 'Done' : 'Edit'}</Button>
      <Button type="button" variant="ghost" className="text-red-800" onClick={() => {
        useRxBuilderStore.getState().removeMedicine(id)
        onRemoved(() => { const state = useRxBuilderStore.getState(); if (state.medicines.some(m => m.id === id)) return; const rows = [...state.medicines]; rows.splice(Math.min(index, rows.length), 0, medicine); state.replaceContent({ medicines: rows }) })
      }}>Remove</Button>
    </div>
    {editing && <div className="mt-4 space-y-3"><div className="flex gap-2"><Button type="button" variant="outline" disabled={index === 0} onClick={() => move(index - 1)}>Move up</Button><Button type="button" variant="outline" disabled={index === count - 1} onClick={() => move(index + 1)}>Move down</Button></div>
      <DoseFields prefix={`edit-${id}`} value={{ ...blankDose, ...medicine }} recentInstructions={instructions} onChange={value => useRxBuilderStore.getState().updateMedicine(id, value)} />
    </div>}
  </article>
})
export const MedicinesPanel = memo(function MedicinesPanel({ doctorId, instructions, onRemoved }: { doctorId: string; instructions: string[]; onRemoved: (restore: () => void) => void }) {
  const ids = useRxBuilderStore(useShallow(s => s.medicines.map(m => m.id)))
  const patientId = useRxBuilderStore(s => s.patientId)
  return <section className="clinic-panel space-y-4 p-4 sm:p-5" aria-labelledby="rx-medicines-heading">
    <div className="flex items-center justify-between"><h2 id="rx-medicines-heading" className="text-lg font-semibold">Medicines</h2><span className="rounded-full bg-secondary px-3 py-1 text-sm">{ids.length} added</span></div>
    <MedicineAutocomplete key={patientId || 'new'} doctorId={doctorId} recentInstructions={instructions} />
    <div className="space-y-3">{ids.map((id, index) => <MedicineRow key={id} id={id} index={index} count={ids.length} instructions={instructions} onRemoved={onRemoved} />)}</div>
    <p className="sr-only" aria-live="polite">{ids.length} medicines in prescription</p>
  </section>
})
export const HistoryControls = memo(function HistoryControls() {
  const canUndo = useRxBuilderStore(s => s.past.length > 0), canRedo = useRxBuilderStore(s => s.future.length > 0)
  return <div className="flex gap-2"><Button type="button" variant="outline" disabled={!canUndo} onClick={() => useRxBuilderStore.getState().undo()}>Undo</Button><Button type="button" variant="outline" disabled={!canRedo} onClick={() => useRxBuilderStore.getState().redo()}>Redo</Button></div>
})
export const MeasurementsPanel = memo(function MeasurementsPanel() {
  const visit = useRxBuilderStore(s => s.visit)
  return <details className="clinic-panel group"><summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-2 rounded-2xl px-4 sm:px-5"><span className="text-lg font-semibold">Visit measurements <span className="text-sm font-normal text-muted-foreground">· Optional</span></span><ChevronDown aria-hidden="true" className="size-5 group-open:rotate-180" /></summary><div className="border-t p-4 sm:p-5"><VisitFields value={visit} onChange={value => useRxBuilderStore.getState().setVisit(value)} /></div></details>
})
export const HandwritingPanel = memo(function HandwritingPanel({ saving, onBusyChange }: { saving: boolean; onBusyChange: (value: boolean) => void }) {
  const handwriting = useRxBuilderStore(s => s.handwriting), patientId = useRxBuilderStore(s => s.patientId)
  return <section className="clinic-panel space-y-3 p-4 sm:p-5"><h2 className="text-lg font-semibold">Handwritten notes</h2><HandwritingEditor key={patientId || 'new'} value={handwriting} onChange={useRxBuilderStore.getState().setHandwriting} disabled={saving || !patientId} onBusyChange={onBusyChange} />{!patientId && <p className="text-sm text-muted-foreground">Choose a patient to add handwriting.</p>}</section>
})
export const ActionBar = memo(function ActionBar({ saving, handwritingBusy, confirmed, saveError, paperSize, onPaperSize, onSave }: { saving: boolean; handwritingBusy: boolean; confirmed: boolean; saveError: string; paperSize: 'A4' | 'A5'; onPaperSize: (size: 'A4' | 'A5') => void; onSave: (print: boolean) => void }) {
  const state = useRxBuilderStore()
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => ref.current ? reserveScrollSpace(ref.current, '--rx-action-bar-height') : undefined, [])
  const reason = confirmed ? rxSaveReason({ ...state, saving, handwritingBusy }) : 'Confirm the copied prescription before saving.'
  return <div ref={ref} className="sticky bottom-0 z-20 space-y-2 rounded-2xl border bg-card p-3 shadow-md">
    {saveError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-900">{saveError}</p>}
    <p id="rx-save-reason" role="status" className="min-h-5 text-sm font-medium text-muted-foreground">{reason || 'Ready to save.'}</p>
    <div className="flex flex-wrap items-center gap-2"><label className="flex min-h-11 items-center gap-2 font-medium">Paper<select className="min-h-11 rounded-lg border bg-card px-2" value={paperSize} onChange={e => onPaperSize(e.target.value === 'A4' ? 'A4' : 'A5')}><option>A5</option><option>A4</option></select></label>
      <Button type="button" variant="outline" className="flex-1" disabled={Boolean(reason)} aria-describedby="rx-save-reason" onClick={() => onSave(false)}><Save aria-hidden="true" />Save Rx</Button><Button type="button" className="flex-1" disabled={Boolean(reason)} aria-describedby="rx-save-reason" onClick={() => onSave(true)}><Printer aria-hidden="true" />{saving ? 'Saving…' : 'Save and print'}</Button></div>
  </div>
})
