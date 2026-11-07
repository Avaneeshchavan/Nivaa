'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { useRxBuilderStore } from '@/stores/rxBuilderStore'
import RxPDFDocument from './RxPDFDocument'
import { visitFormSchema } from '@/lib/validations/visit.schema'
import type { PrescriptionPatient } from '@/lib/prescription-patient'
import type { Doctor } from '@/lib/generated/prisma/client'

const PDFViewer = dynamic(() => import('./PDFViewerWrapper'), {
  ssr: false, loading: () => <p className="p-5" role="status">Preparing PDF…</p>,
})

export default function RxPreview({ patient, doctor, paperSize }: { patient?: PrescriptionPatient; doctor: Doctor; paperSize: 'A4' | 'A5' }) {
  const { diagnosis, medicines, notes, visit, handwriting } = useRxBuilderStore()
  const [assets, setAssets] = useState<{ logoUrl?: string; signatureUrl?: string } | null>(null)
  const [photo, setPhoto] = useState<{ id: string; data: string } | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/clinic/print-assets', { signal: controller.signal, cache: 'no-store', redirect: 'error' })
      .then(response => { if (!response.ok) throw new Error('Preview unavailable'); return response.json() })
      .then(setAssets).catch(() => { if (!controller.signal.aborted) setError('Print preview unavailable. You can still save and print.') })
    return () => controller.abort()
  }, [])
  useEffect(() => {
    const controller = new AbortController()
    setPhoto(null)
    const id = handwriting.photoId
    if (!id) return
    fetch(`/api/handwriting/${id}`, { signal: controller.signal, cache: 'no-store', redirect: 'error' })
      .then(response => { if (!response.ok) throw new Error('Photo unavailable'); return response.blob() })
      .then(blob => new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result))
        reader.onerror = reject
        reader.readAsDataURL(blob)
      })).then(data => { if (!controller.signal.aborted) setPhoto({ id, data }) })
      .catch(() => { if (!controller.signal.aborted) setError('Attached photo unavailable. Try reopening the preview.') })
    return () => controller.abort()
  }, [handwriting.photoId])

  const measurements = visitFormSchema.safeParse(visit)
  if (error) return <p role="alert" className="clinic-panel p-5">{error}</p>
  if (!assets || (handwriting.photoId && photo?.id !== handwriting.photoId)) return <p role="status">Loading print assets…</p>
  return <section className="clinic-panel sticky top-4 flex h-[75dvh] min-h-96 flex-col overflow-hidden">
    <h2 className="border-b p-4 text-lg font-semibold">Live print preview</h2>
    <PDFViewer className="h-full w-full flex-1 border-0">
      <RxPDFDocument doctor={doctor} patient={patient || { name: 'Select a patient', dob: null, phone: null, gender: null, allergies: null }}
        prescription={{ diagnosis, medicines, notes, handwriting, createdAt: new Date(), id: 'DRAFT' }}
        visit={measurements.success ? measurements.data : undefined} clinicName={doctor.clinicName || 'Clinic'}
        {...assets} handwritingPhoto={photo?.data} paperSize={paperSize} />
    </PDFViewer>
  </section>
}
