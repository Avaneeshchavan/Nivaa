import { create } from 'zustand'

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
  patientId: string | null
  diagnosis: string
  medicines: RxMedicine[]
  notes: string
  templateId: string | null
  
  // Actions
  setPatientId: (id: string | null) => void
  setDiagnosis: (diagnosis: string) => void
  addMedicine: (medicine: RxMedicine) => void
  updateMedicine: (id: string, medicine: Partial<RxMedicine>) => void
  removeMedicine: (id: string) => void
  setNotes: (notes: string) => void
  applyTemplate: (template: any) => void
  reset: () => void
}

const initialState = {
  patientId: null,
  diagnosis: '',
  medicines: [],
  notes: '',
  templateId: null,
}

export const useRxBuilderStore = create<RxBuilderState>((set) => ({
  ...initialState,

  setPatientId: (id) => set({ patientId: id }),
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
    // Expected template to have diagnosis and medicines (parsed JSON)
    const parsedMedicines = typeof template.medicines === 'string' 
      ? JSON.parse(template.medicines) 
      : (template.medicines || [])
      
    set({
      diagnosis: template.diagnosis || '',
      medicines: parsedMedicines,
      templateId: template.id
    })
  },
  
  reset: () => set(initialState),
}))
