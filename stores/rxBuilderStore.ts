import { parseRxMedicines } from '@/lib/validations/prescription.schema'
import type { DiseaseTemplate } from '@/lib/generated/prisma/client'
import { emptyHandwriting, type Handwriting } from '@/lib/validations/handwriting.schema'
import { create } from 'zustand'
import { emptyVisitForm, type VisitFormValues } from '@/lib/validations/visit.schema'

export interface RxMedicine {
  id: string
  name: string
  generic?: string | null
  form?: string | null
  dosage: string
  frequency: string
  duration: string
  instructions: string
}

interface RxBuilderState {
  visit: VisitFormValues
  setVisit: (visit: VisitFormValues) => void
  patientId: string | null
  diagnosis: string
  medicines: RxMedicine[]
  notes: string
  handwriting: Handwriting
  setHandwriting: (handwriting: Handwriting) => void
  templateId: string | null
  
  // Actions
  setPatientId: (id: string | null) => void
  setDiagnosis: (diagnosis: string) => void
  addMedicine: (medicine: RxMedicine) => void
  updateMedicine: (id: string, medicine: Partial<RxMedicine>) => void
  removeMedicine: (id: string) => void
  setNotes: (notes: string) => void
  applyTemplate: (template: Pick<DiseaseTemplate, 'id' | 'diagnosis' | 'medicines'>) => void
  reset: () => void
}

const initialState = {
  visit: emptyVisitForm,
  patientId: null,
  diagnosis: '',
  medicines: [],
  notes: '',
  handwriting: emptyHandwriting,
  templateId: null,
}

export const useRxBuilderStore = create<RxBuilderState>((set) => ({
  ...initialState,

  setHandwriting: (handwriting) => set({ handwriting }),
  setVisit: (visit) => set({ visit }),
  setPatientId: (id) => set(state => ({ patientId: id, ...(id !== state.patientId ? { visit: { ...emptyVisitForm }, handwriting: emptyHandwriting } : {}) })),
  setDiagnosis: (diagnosis) => set({ diagnosis }),
  
  addMedicine: (medicine) => 
    set((state) => ({ medicines: [...state.medicines, medicine] })),
    
  updateMedicine: (id, medicineUpdate) =>
    set((state) => ({
      medicines: state.medicines.map((m) => 
        m.id === id ? { ...m, ...medicineUpdate } : m
      )
    })),
    
  removeMedicine: (id) =>
    set((state) => ({
      medicines: state.medicines.filter((m) => m.id !== id)
    })),
    
  setNotes: (notes) => set({ notes }),
  
  applyTemplate: (template) => {
    const parsedMedicines = parseRxMedicines(template.medicines).map(m => ({ ...m, id: crypto.randomUUID() }))

    set({
      diagnosis: template.diagnosis || '',
      medicines: parsedMedicines,
      templateId: template.id
    })
  },
  
  reset: () => set(initialState),
}))
