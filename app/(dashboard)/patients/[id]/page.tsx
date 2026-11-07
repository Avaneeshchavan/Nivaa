import { getPatient } from '@/actions/patients.actions'
import AllergiesBanner from '@/components/patients/AllergiesBanner'
import { formatVisitMeasurements } from '@/lib/validations/visit.schema'
import HeaderSetter from '@/components/dashboard/HeaderSetter'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { format } from 'date-fns'
import { ArrowLeft, Edit, FileText, Calendar, Activity } from 'lucide-react'
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
      <Link href="/patients" className={buttonVariants({ variant: 'ghost', className: '-ml-3 text-primary' })}><ArrowLeft aria-hidden="true" />All patients</Link>

      {/* Top Section */}
      <Card className="clinic-panel">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <p className="clinic-kicker mb-2">Patient record</p>
              <h1 className="clinic-heading break-words">{patient.name}</h1>
              <p className="text-muted-foreground mt-2">
                {patient.gender ? patient.gender[0] + patient.gender.slice(1).toLowerCase() : 'Gender not recorded'} · {patient.dob ? format(new Date(patient.dob), 'MMM d, yyyy') : 'DOB N/A'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link href={`/prescriptions/new?patientId=${patient.id}`} className={buttonVariants({ size: 'lg' })}>
                <FileText aria-hidden="true" />New prescription
              </Link>
              <Link href={`/prescriptions/new?patientId=${patient.id}&repeat=1`} className={buttonVariants({ variant: 'outline', size: 'lg' })}>Repeat last Rx</Link>
              <Link href={`/patients/${patient.id}/edit`} className={buttonVariants({ variant: 'outline', size: 'lg' })}>
                <Edit aria-hidden="true" />Edit patient
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      <AllergiesBanner allergies={patient.allergies} />
      <Tabs defaultValue="visits" className="w-full">
        <TabsList className="grid w-full sm:w-fit grid-cols-2 gap-1 rounded-xl bg-secondary p-1 mb-4">
          <TabsTrigger
            value="visits"
            className="min-h-12 whitespace-normal rounded-lg px-3 sm:px-6 py-2 text-base"
          >
            Visits & Prescriptions
          </TabsTrigger>
          <TabsTrigger
            value="details"
            className="min-h-12 whitespace-normal rounded-lg px-3 sm:px-6 py-2 text-base"
          >
            Details
          </TabsTrigger>
        </TabsList>

        <TabsContent value="visits" className="space-y-4 outline-none">
          {patient.visits.length === 0 ? (
            <div className="clinic-panel text-center px-4 py-10">
              <Calendar className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground font-medium">No previous visits</p>
              <p className="text-sm text-muted-foreground">Start by creating a new prescription.</p>
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
                          <p className="font-semibold text-foreground">
                            {format(new Date(visit.date), 'MMMM d, yyyy')}
                          </p>
                          <p className="text-muted-foreground text-sm mt-1">
                            {visit.diagnosis || 'No diagnosis recorded'}
                          </p>
                          {formatVisitMeasurements(visit) && <p className="text-sm text-muted-foreground mt-1">{formatVisitMeasurements(visit)}</p>}
                        </div>
                      </div>
                      <div className="w-full sm:w-auto space-y-2">
                        {prescriptions.length ? prescriptions.map((rx, index) => (
                          <div key={rx.id} className="flex flex-wrap gap-2">
                            <a href={`/api/prescriptions/${rx.id}/pdf`} target="_blank" rel="noopener noreferrer"
                              className={buttonVariants({ variant: 'secondary', className: 'min-h-11' })}>
                              View Rx{prescriptions.length > 1 ? ` ${index + 1}` : ''}
                            </a>
                            <Link href={`/prescriptions/${rx.id}/notes`} className={buttonVariants({ variant: 'outline', className: 'min-h-11' })}>Add / edit notes</Link>
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
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Phone Number</h4>
                  <p className="text-foreground">{patient.phone || 'Not provided'}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Address</h4>
                  <p className="text-foreground">{patient.address || 'Not provided'}</p>
                </div>
                <div className="sm:col-span-2">
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Allergies & Notes</h4>
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
