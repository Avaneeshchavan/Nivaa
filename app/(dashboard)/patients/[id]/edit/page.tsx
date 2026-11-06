'use client'

import { useEffect, useState, use } from 'react'
import { getPatient } from '@/actions/patients.actions'
import PatientForm from '@/components/patients/PatientForm'
import { useHeader } from '@/components/dashboard/HeaderContext'
import { Skeleton } from '@/components/ui/skeleton'

export default function EditPatientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { setTitle } = useHeader()
  const [patient, setPatient] = useState<import('@/types').PatientWithVisits | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setTitle('Edit Patient')
    getPatient(id)
      .then((data) => {
        setPatient(data)
        setLoading(false)
      })
      .catch((err) => {
        console.error(err)
        setLoading(false)
      })
  }, [id, setTitle])

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto py-6 space-y-6">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (!patient) {
    return <div className="text-center py-10">Patient not found</div>
  }

  return (
    <div className="max-w-2xl mx-auto py-6">
      <div className="mb-6"><p className="clinic-kicker mb-2">Patient records</p><h1 className="clinic-heading">Edit patient</h1><p className="mt-2 text-muted-foreground">Update contact information and allergy notes.</p></div>
      <PatientForm
        initialData={{
          ...patient,
          gender: patient.gender as "MALE" | "FEMALE" | "OTHER" | null | undefined,
          dob: patient.dob ? new Date(patient.dob).toISOString().split('T')[0] : '',
        }}
      />
    </div>
  )
}
