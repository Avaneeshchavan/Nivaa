import { prescriptionSchema, type CreatePrescriptionInput } from '../validations/prescription.schema'
import { visitFormSchema, type VisitFormValues } from '../validations/visit.schema'

type SaveState = Omit<CreatePrescriptionInput, 'patientId' | 'visit'> & {
  patientId: string | null
  visit: VisitFormValues
  saving: boolean
  handwritingBusy: boolean
}

// Use the same schemas as the save action, without requiring medicines when
// the doctor is saving diagnosis, advice, or a handwritten prescription.
export function rxSaveReason(state: SaveState): string | null {
  if (state.saving) return 'Saving prescription…'
  if (!state.patientId) return 'Select a patient to save.'
  if (state.handwritingBusy) return 'Finish drawing or uploading the note before saving.'
  const { diagnosis, medicines, notes, handwriting } = state
  if (!(diagnosis.trim() || medicines.length || notes.trim() || handwriting?.strokes.length || handwriting?.photoId)) {
    return 'Add a medicine, diagnosis, advice, or handwritten note to save.'
  }
  const visit = visitFormSchema.safeParse(state.visit)
  if (!visit.success) return 'Check visit measurements before saving.'
  const payload = prescriptionSchema.safeParse({ ...state, visit: visit.data })
  if (!payload.success) {
    const field = payload.error.issues[0]?.path[0]
    const label = field === 'medicines' ? 'medicine entries' : field === 'notes' ? 'notes and advice' : field === 'diagnosis' ? 'diagnosis' : 'handwritten notes'
    return `Check ${label} before saving (an entry is invalid or too long).`
  }
  return null
}
