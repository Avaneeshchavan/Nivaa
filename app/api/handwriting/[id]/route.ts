import { z } from 'zod'
import { getCurrentDoctor } from '@/actions/auth.actions'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const headers = { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' }
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const doctor = await getCurrentDoctor()
  if (!doctor) return new NextResponse(null, { status: 401, headers })
  const { id } = await params
  if (!z.uuid().safeParse(id).success) return new NextResponse(null, { status: 404, headers })
  const supabase = await createClient()
  const { data, error } = await supabase.storage.from('prescription-notes').download(`${doctor.supabaseId}/${id}.jpg`)
  if (error || !data) return new NextResponse(null, { status: 404, headers })
  return new NextResponse(await data.arrayBuffer(), { headers: { ...headers, 'Content-Type': 'image/jpeg' } })
}
