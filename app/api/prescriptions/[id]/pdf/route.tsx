import { getPdfAssets } from '@/lib/pdf-assets'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentDoctor } from '@/actions/auth.actions'
import { createClient } from '@/lib/supabase/server'
import { renderToStream } from '@react-pdf/renderer'
import RxPDFDocument from '@/components/prescriptions/RxPDFDocument'

const privateHeaders = { 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff' }

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const doctor = await getCurrentDoctor()
    if (!doctor) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: privateHeaders })
    }

    const { id } = await params

    const prescription = await prisma.prescription.findFirst({
      where: { id, doctorId: doctor.id, patient: { doctorId: doctor.id } },
      include: {
        patient: true,
        visit: true,
      },
    })

    if (!prescription || prescription.doctorId !== doctor.id || prescription.patient.doctorId !== doctor.id ||
      (prescription.visit && (prescription.visit.doctorId !== doctor.id || prescription.visit.patientId !== prescription.patientId))) {
      return NextResponse.json({ error: 'Not found or unauthorized' }, { status: 404, headers: privateHeaders })
    }

    const assets = await getPdfAssets(doctor)
    const paperSize = new URL(request.url).searchParams.get('size') === 'A4' ? 'A4' : 'A5'
    // Render PDF to stream
    const pdfStream = await renderToStream(
      <RxPDFDocument
        doctor={doctor}
        patient={prescription.patient}
        prescription={prescription}
        visit={prescription.visit}
        clinicName={doctor.clinicName || 'Clinic'}
        {...assets}
        paperSize={paperSize}
      />
    )

    // Convert stream to Buffer
    const chunks: Buffer[] = []
    for await (const chunk of pdfStream as unknown as AsyncIterable<Uint8Array>) {
      chunks.push(Buffer.from(chunk))
    }
    const pdfBuffer = Buffer.concat(chunks)

    // Upload to Supabase Storage
    const supabase = await createClient()
    // Storage policies match the verified Auth UUID, not the internal Doctor CUID.
    const filePath = `${doctor.supabaseId}/${prescription.id}-${paperSize}.pdf`

    const { error: uploadError } = await supabase.storage
      .from('prescriptions')
      .upload(filePath, pdfBuffer, {
        contentType: 'application/pdf',
        cacheControl: '0',
        upsert: true,
      })

    if (uploadError) {
      console.error('Prescription PDF archive upload failed')
      // Continue anyway, we can still serve the PDF to the doctor
    }

    if (!uploadError) {
      // Authorize and render first; never persist bearer URLs in the database.
      const { data, error } = await supabase.storage.from('prescriptions').createSignedUrl(filePath, 60)
      if (!error && data?.signedUrl) {
        const response = NextResponse.redirect(data.signedUrl, 307)
        Object.entries(privateHeaders).forEach(([name, value]) => response.headers.set(name, value))
        return response
      }
    }

    // Storage unavailable: preserve the authenticated direct-print fallback.
    return new NextResponse(pdfBuffer, {
      headers: {
        ...privateHeaders,
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="prescription-${prescription.id}.pdf"`,
      },
    })

  } catch {
    console.error('Prescription PDF generation failed')
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500, headers: privateHeaders })
  }
}
