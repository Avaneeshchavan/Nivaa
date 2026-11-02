import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentDoctor } from '@/actions/auth.actions'
import { createClient } from '@/lib/supabase/server'
import { renderToStream } from '@react-pdf/renderer'
import RxPDFDocument from '@/components/prescriptions/RxPDFDocument'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const doctor = await getCurrentDoctor()
    if (!doctor) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const prescription = await prisma.prescription.findUnique({
      where: { id },
      include: {
        patient: true,
      },
    })

    if (!prescription || prescription.doctorId !== doctor.id) {
      return NextResponse.json({ error: 'Not found or unauthorized' }, { status: 404 })
    }

    // Render PDF to stream
    const pdfStream = await renderToStream(
      <RxPDFDocument
        doctor={doctor}
        patient={prescription.patient}
        prescription={prescription}
        clinicName="Nivaa Clinic" // Can be fetched from doctor profile later
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
    const filePath = `${doctor.id}/${prescription.id}.pdf`

    const { error: uploadError } = await supabase.storage
      .from('prescriptions')
      .upload(filePath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      })

    if (uploadError) {
      console.error('Error uploading PDF to Supabase:', uploadError)
      // Continue anyway, we can still serve the PDF to the doctor
    } else {
      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from('prescriptions')
        .getPublicUrl(filePath)
        
      if (publicUrlData?.publicUrl) {
        // Update DB
        await prisma.prescription.update({
          where: { id: prescription.id },
          data: { pdfUrl: publicUrlData.publicUrl },
        })
      }
    }

    // Return the PDF directly
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="prescription-${prescription.id}.pdf"`,
      },
    })

  } catch (error) {
    console.error('Error generating PDF:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
