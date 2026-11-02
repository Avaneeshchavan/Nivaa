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
      <PatientForm />
    </div>
  )
}
