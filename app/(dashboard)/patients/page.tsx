import { getPatients } from '@/actions/patients.actions'
import PatientDirectory from '@/components/patients/PatientDirectory'

export const dynamic = 'force-dynamic'

export default async function PatientsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams
  return <PatientDirectory initialPatients={await getPatients(q)} />
}
