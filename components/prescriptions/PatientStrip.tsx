'use client'

import { TriangleAlert, UserRound } from 'lucide-react'
import type { PrescriptionPatient } from '@/lib/prescription-patient'
import { patientAge } from '@/lib/prescriptions/patient-age'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

export default function PatientStrip({ patient }: { patient?: PrescriptionPatient }) {
  const age = patientAge(patient?.dob)
  const allergies = patient?.allergies?.trim()
  const sex = patient?.gender ? patient.gender[0] + patient.gender.slice(1).toLowerCase() : 'Sex not recorded'
  return <section aria-label="Current prescription patient" className="clinic-panel space-y-2 p-3 sm:px-4">
    <div className="flex min-w-0 items-start gap-3">
      <UserRound aria-hidden="true" className="mt-1 size-5 shrink-0 text-primary" />
      <div className="min-w-0">
        <h2 className="text-lg font-semibold break-words">{patient?.name || 'Select a patient'}</h2>
        {patient && <p className="text-sm font-medium text-muted-foreground">{age === null ? 'Age not recorded' : age === 0 ? 'Under 1 year' : `${age} ${age === 1 ? 'year' : 'years'}`} · {sex}</p>}
      </div>
    </div>
    {patient && (allergies ? <div role="note" aria-label="Patient allergies" className="flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-red-950">
      <TriangleAlert aria-hidden="true" className="size-5 shrink-0" />
      <p className="min-w-0 flex-1 line-clamp-2 break-words text-sm"><strong>Allergies: </strong>{allergies}</p>
      <Dialog>
        <DialogTrigger render={<Button type="button" variant="outline" size="sm" className="min-h-11 border-red-300 bg-white text-red-950" />}>Read allergies</DialogTrigger>
        <DialogContent showCloseButton={false} className="sm:max-w-lg">
          <DialogTitle>Allergies</DialogTitle>
          <DialogDescription>Recorded allergies for the current prescription patient.</DialogDescription>
          <p className="max-h-[50dvh] overflow-y-auto whitespace-pre-wrap break-words text-base text-red-950">{allergies}</p>
          <DialogClose render={<Button type="button" variant="outline" />}>Close</DialogClose>
        </DialogContent>
      </Dialog>
    </div> : <p role="note" className="text-sm font-medium text-muted-foreground">Allergies not recorded</p>)}
  </section>
}
