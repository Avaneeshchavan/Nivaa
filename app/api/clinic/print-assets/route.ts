import { getCurrentDoctor } from '@/actions/auth.actions'
import { getPdfAssets } from '@/lib/pdf-assets'
import { NextResponse } from 'next/server'

export async function GET() {
  const doctor = await getCurrentDoctor()
  const headers = { 'Cache-Control': 'private, no-store' }
  if (!doctor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers })
  return NextResponse.json(await getPdfAssets(doctor), { headers })
}
