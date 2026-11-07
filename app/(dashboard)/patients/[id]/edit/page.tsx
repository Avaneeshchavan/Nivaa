import { getPatientForEdit } from '@/actions/patients.actions'
import PatientForm from '@/components/patients/PatientForm'
import HeaderSetter from '@/components/dashboard/HeaderSetter'

export default async function EditPatientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const patient = await getPatientForEdit(id)
  return <div className="max-w-2xl mx-auto py-6">
    <HeaderSetter title="Edit patient" />
    <div className="mb-6"><p className="clinic-kicker mb-2">Patient records</p><h1 className="clinic-heading">Edit patient</h1><p className="mt-2 text-muted-foreground">Update contact information and allergy notes.</p></div>
    <PatientForm initialData={{ ...patient,
      gender: patient.gender as 'MALE' | 'FEMALE' | 'OTHER' | null,
      dob: patient.dob ? patient.dob.toISOString().split('T')[0] : '',
    }} />
  </div>
}
