import { getPatients } from '@/actions/patients.actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import SearchInput from '@/components/patients/SearchInput'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { format } from 'date-fns'

export const dynamic = 'force-dynamic'

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const patients = await getPatients(q)

  return (
    <div className="space-y-6 relative min-h-full">
      <div className="sticky top-16 z-30 bg-gray-50 pb-4 pt-2 -mx-4 px-4 md:mx-0 md:px-0">
        <SearchInput />
      </div>

      {patients.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <p className="text-lg font-medium">No patients found</p>
          <p className="text-sm">Try adjusting your search or add a new patient.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-24">
          {patients.map((patient) => {
            const lastVisit = patient.visits[0]
            return (
              <Link key={patient.id} href={`/patients/${patient.id}`}>
                <Card className="hover:shadow-md transition-shadow active:scale-[0.98]">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">{patient.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-gray-600 space-y-1">
                    <p>
                      <span className="font-medium">Phone:</span> {patient.phone || 'N/A'}
                    </p>
                    <p>
                      <span className="font-medium">Last Visit:</span>{' '}
                      {lastVisit ? format(new Date(lastVisit.date), 'MMM d, yyyy') : 'Never'}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}

      {/* FAB - Floating Action Button */}
      <Link
        href="/patients/new"
        className="fixed bottom-20 md:bottom-8 right-4 md:right-8 h-14 w-14 bg-primary text-primary-foreground rounded-full shadow-lg flex items-center justify-center hover:bg-primary/90 active:scale-95 transition-all z-50"
      >
        <Plus className="w-6 h-6" />
      </Link>
    </div>
  )
}
