'use client'

import { useEffect } from 'react'
import PatientForm from '@/components/patients/PatientForm'
import { useHeader } from '@/components/dashboard/HeaderContext'

export default function NewPatientPage() {
  const { setTitle } = useHeader()

  useEffect(() => {
    setTitle('New Patient')
  }, [setTitle])

  return (
    <div className="max-w-2xl mx-auto py-6">
      <div className="mb-6"><p className="clinic-kicker mb-2">Patient records</p><h1 className="clinic-heading">Add patient</h1><p className="mt-2 text-muted-foreground">Enter the patient’s contact details and any known allergies.</p></div>
      <PatientForm />
    </div>
  )
}
