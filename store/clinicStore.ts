import { create } from 'zustand'

interface ClinicState {
  doctorName: string | null
  clinicName: string | null
  logoUrl: string | null
  setClinicData: (data: Partial<ClinicState>) => void
}

export const useClinicStore = create<ClinicState>((set) => ({
  doctorName: null,
  clinicName: null,
  logoUrl: null,
  setClinicData: (data) => set((state) => ({ ...state, ...data })),
}))
