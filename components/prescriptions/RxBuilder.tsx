'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useRxBuilderStore } from '@/stores/rxBuilderStore'
import { createPrescription } from '@/actions/prescriptions.actions'
import { DiseaseTemplate, Patient } from '@/lib/generated/prisma/client'
import DiseaseTemplateSelector from './DiseaseTemplateSelector'
import MedicineAutocomplete from './MedicineAutocomplete'
import RxPreview from './RxPreview'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import Toast from '@/components/ui/Toast'
import type { DuplicateRxDraft } from '@/lib/validations/prescription.schema'
import { Printer, Save } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface RxBuilderProps {
  duplicate?: DuplicateRxDraft | null
  initialPatientId?: string
  patients: Patient[]
  templates: DiseaseTemplate[]
}

export default function RxBuilder({ initialPatientId, patients, templates, duplicate }: RxBuilderProps) {
  const router = useRouter()
  const { 
    patientId, setPatientId, 
    diagnosis, setDiagnosis, 
    medicines, notes, setNotes, 
    reset 
  } = useRxBuilderStore()

  const [saving, setSaving] = useState(false)

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
    })
    if (duplicate) setToast('Prescription copied for today. Review and save as a new Rx.')
    return () => reset()
  }, [initialPatientId, duplicate, reset])

  const handleSave = async (print: boolean) => {
    if (!patientId) {
      alert('Please select a patient first.')
      return
    }

    setSaving(true)
    try {
      const rx = await createPrescription({
        patientId,
        diagnosis,
        medicines,
        notes
      })
      
      if (print) {
        window.open(`/api/prescriptions/${rx.id}/pdf`, '_blank')
      }
      
      router.push(`/patients/${patientId}`)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error saving prescription')
      setSaving(false)
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full pb-20 md:pb-0">
      
      {toast && <Toast message={toast} onDismiss={dismissToast} />}
      {/* LEFT PANEL: Form */}
      <div className="space-y-6 animate-in fade-in duration-300">
        
        <p className="text-sm text-gray-600">{patients.find(p => p.id === patientId)?.name} · {new Date().toLocaleDateString('en-IN')}</p>
        {/* Patient Selection (If not pre-filled from URL) */}
        {!initialPatientId && (
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
            <label className="text-sm font-semibold text-gray-700 block mb-2">Select Patient</label>
            <Select value={patientId || undefined} onValueChange={setPatientId}>
              <SelectTrigger className="w-full h-12 bg-gray-50 text-base">
                <SelectValue placeholder="Search or select patient..." />
              </SelectTrigger>
              <SelectContent>
                {patients.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} {p.phone ? `(${p.phone})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Diagnosis & Templates */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
            <label className="text-sm font-semibold text-gray-700 block">Diagnosis</label>
            <DiseaseTemplateSelector templates={templates} />
          </div>
          <Input 
            value={diagnosis} 
            onChange={(e) => setDiagnosis(e.target.value)} 
            placeholder="e.g. Viral Fever, Hypertension..."
            className="h-12 text-base"
          />
        </div>

        {/* Medicines List */}
        <div className="space-y-4">
          <label className="text-sm font-semibold text-gray-700 block">Prescription Items</label>
          
          <div className="space-y-3">
            {medicines.map((med, idx) => (
              <div key={med.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex flex-wrap justify-between items-start gap-4 animate-in slide-in-from-bottom-2">
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">{idx + 1}. {med.name}</h4>
                  <div className="text-sm text-gray-600 flex flex-wrap gap-x-3 mt-1">
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
                  className="min-h-11 text-red-500 hover:text-red-700 hover:bg-red-50"
                  onClick={() => useRxBuilderStore.getState().removeMedicine(med.id)}
                >
                  Remove
                </Button>
                {editingMedicine === med.id && (
                  <div className="grid grid-cols-2 gap-3 w-full">
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

          {/* Autocomplete Input */}
          <MedicineAutocomplete />
        </div>

        {/* Notes */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
          <label className="text-sm font-semibold text-gray-700 block mb-2">Notes / Advice</label>
          <Textarea 
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any additional advice, diet restrictions, or next visit info..."
            className="min-h-[120px] resize-none text-base"
          />
        </div>

        {/* Action Bar */}
        <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t sticky bottom-0 bg-gray-50/90 backdrop-blur py-4 z-10 md:static md:bg-transparent md:backdrop-blur-none">
          <Button 
            variant="outline" 
            className="flex-1 h-14 text-base" 
            onClick={() => handleSave(false)}
            disabled={saving || (!diagnosis && medicines.length === 0)}
          >
            <Save className="w-5 h-5 mr-2" />
            Save Draft
          </Button>
          <Button 
            className="flex-1 h-14 text-base" 
            onClick={() => handleSave(true)}
            disabled={saving || (!diagnosis && medicines.length === 0)}
          >
            <Printer className="w-5 h-5 mr-2" />
            Save & Print Rx
          </Button>
        </div>

      </div>

      {/* RIGHT PANEL: Live Preview */}
      <div className="hidden md:block">
        <RxPreview />
      </div>

    </div>
  )
}
