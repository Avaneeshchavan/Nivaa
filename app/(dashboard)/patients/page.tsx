import { getPatients } from '@/actions/patients.actions'
import PatientDirectory from '@/components/patients/PatientDirectory'

export const dynamic = 'force-dynamic'

export default async function PatientsPage() {
  return <PatientDirectory initialPatients={await getPatients()} />
}
