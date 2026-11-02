import { getPatient } from '@/actions/patients.actions'
import HeaderSetter from '@/components/dashboard/HeaderSetter'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { format } from 'date-fns'
import { Edit, FileText, Calendar, Activity } from 'lucide-react'
import Link from 'next/link'

export default async function PatientDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const patient = await getPatient(id)

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <HeaderSetter title={patient.name} />

      {/* Top Section */}
      <Card className="border-none shadow-sm bg-white">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{patient.name}</h2>
              <p className="text-gray-500 mt-1">
                {patient.gender} • {patient.dob ? format(new Date(patient.dob), 'MMM d, yyyy') : 'DOB N/A'}
              </p>
            </div>
            <div className="flex items-center gap-3 w-full md:w-auto">
              <Link href={`/prescriptions/new?patientId=${patient.id}`} className="w-full md:w-auto">
                <Button className="w-full md:w-auto gap-2 h-12 md:h-10">
                  <FileText className="w-4 h-4" />
                  New Prescription
                </Button>
              </Link>
              <Link href={`/patients/${patient.id}/edit`}>
                <Button variant="outline" size="icon" className="h-12 w-12 md:h-10 md:w-10">
                  <Edit className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs Section */}
      <Tabs defaultValue="visits" className="w-full">
        <TabsList className="w-full justify-start border-b bg-transparent h-auto p-0 rounded-none mb-6">
          <TabsTrigger
            value="visits"
            className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-6 py-3 text-base"
          >
            Visits & Prescriptions
          </TabsTrigger>
          <TabsTrigger
            value="details"
            className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-6 py-3 text-base"
          >
            Details
          </TabsTrigger>
        </TabsList>

        <TabsContent value="visits" className="space-y-4 outline-none">
          {patient.visits.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg border border-dashed">
              <Calendar className="w-10 h-10 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No previous visits</p>
              <p className="text-sm text-gray-400">Start by creating a new prescription.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {patient.visits.map((visit) => {
                const prescriptions = [...visit.prescriptions].sort(
                  (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
                )

                return (
                  <Card key={visit.id} className="shadow-sm">
                    <CardContent className="p-4 sm:p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div className="flex gap-4">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Activity className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">
                            {format(new Date(visit.date), 'MMMM d, yyyy')}
                          </p>
                          <p className="text-gray-600 text-sm mt-1">
                            {visit.diagnosis || 'No diagnosis recorded'}
                          </p>
                        </div>
                      </div>
                      <div className="w-full sm:w-auto space-y-2">
                        {prescriptions.length ? prescriptions.map((rx, index) => (
                          <div key={rx.id} className="flex flex-wrap gap-2">
                            <a href={`/api/prescriptions/${rx.id}/pdf`} target="_blank" rel="noopener noreferrer"
                              className={buttonVariants({ variant: 'secondary', className: 'min-h-11' })}>
                              View Rx{prescriptions.length > 1 ? ` ${index + 1}` : ''}
                            </a>
                            <Link href={`/prescriptions/new?duplicateId=${rx.id}`}
                              className={buttonVariants({ variant: 'outline', className: 'min-h-11' })}>
                              Duplicate as new Rx
                            </Link>
                          </div>
                        )) : <Button variant="secondary" className="min-h-11" disabled>No Rx</Button>}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="details" className="outline-none">
          <Card className="shadow-sm border-none bg-white">
            <CardHeader>
              <CardTitle className="text-lg">Patient Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8">
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Phone Number</h4>
                  <p className="text-gray-900">{patient.phone || 'Not provided'}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Address</h4>
                  <p className="text-gray-900">{patient.address || 'Not provided'}</p>
                </div>
                <div className="sm:col-span-2">
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Allergies & Notes</h4>
                  <div className="p-4 bg-red-50 text-red-800 rounded-md text-sm border border-red-100">
                    {patient.allergies || 'No known allergies'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
