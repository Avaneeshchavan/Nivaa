'use client'

import dynamic from 'next/dynamic'
import { useState, useEffect } from 'react'
import { useRxBuilderStore } from '@/stores/rxBuilderStore'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText, Maximize2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from '@/components/ui/dialog'
import RxPDFDocument from './RxPDFDocument'
import { visitFormSchema } from '@/lib/validations/visit.schema'
import type { Patient, Doctor } from '@/lib/generated/prisma/client'

// Dynamically import PDFViewerWrapper to avoid SSR issues
const PDFViewer = dynamic(
  () => import('./PDFViewerWrapper'),
  { ssr: false, loading: () => <div className="animate-pulse bg-muted w-full h-full min-h-[500px] flex items-center justify-center text-muted-foreground">Loading PDF Preview...</div> }
)

export default function RxPreview({ patient, doctor, assets, paperSize }: { patient?: Patient; doctor: Doctor; assets: { logoUrl?: string; signatureUrl?: string }; paperSize: 'A4' | 'A5' }) {
  const [mounted, setMounted] = useState(false)
  const { diagnosis, medicines, notes, visit } = useRxBuilderStore()

  useEffect(() => {
    setMounted(true)
  }, [])

  // Mock objects for live preview

  const previewPatient = patient || { name: 'Select a patient', dob: null, phone: null, gender: null, allergies: null }
  const measurements = visitFormSchema.safeParse(visit)
  const previewPrescription = {
    diagnosis,
    medicines,
    notes,
    createdAt: new Date(),
    id: 'DRAFT'
  }

  const isEmpty = !patient && !diagnosis && medicines.length === 0 && !notes

  if (!mounted) return <div className="min-h-12 xl:min-h-96 w-full bg-muted animate-pulse rounded-lg" />

  const PDFComponent = (
    <PDFViewer className="w-full h-full min-h-0 border-0 rounded-lg">
      <RxPDFDocument 
        doctor={doctor}
        patient={previewPatient}
        visit={measurements.success ? measurements.data : undefined}
        prescription={previewPrescription}
        clinicName={doctor.clinicName || 'Clinic'}
        {...assets}
        paperSize={paperSize}
      />
    </PDFViewer>
  )

  return (
    <>
      {/* Desktop View */}
      <Card className="hidden xl:flex flex-col sticky top-4 h-[calc(100dvh-7rem)] min-h-[24rem] overflow-hidden bg-white shadow-sm border-border">
        <CardHeader className="border-b bg-muted/50 pb-4 shrink-0">
          <div className="flex items-center gap-2 text-primary">
            <FileText className="w-5 h-5" />
            <CardTitle className="text-lg">Live PDF Preview</CardTitle>
          </div>
        </CardHeader>
        
        <CardContent className="p-0 flex-1 relative bg-muted">
          {isEmpty ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
              <FileText className="w-12 h-12 mb-4 opacity-20" />
              <p>Start building the prescription to see a preview.</p>
            </div>
          ) : (
            PDFComponent
          )}
        </CardContent>
      </Card>

      {/* Mobile View */}
      <div className="xl:hidden block">
        <Dialog>
          <DialogTrigger
            render={
              <Button variant="outline" className="w-full h-12 bg-card" disabled={isEmpty}>
                <Maximize2 className="w-4 h-4 mr-2" />
                Preview PDF
              </Button>
            }
          />
          <DialogContent className="w-[95vw] h-[90vh] max-w-none sm:max-w-none p-0 overflow-hidden flex flex-col">
            <DialogTitle className="sr-only">Live PDF Preview</DialogTitle>
            {PDFComponent}
          </DialogContent>
        </Dialog>
      </div>
    </>
  )
}
