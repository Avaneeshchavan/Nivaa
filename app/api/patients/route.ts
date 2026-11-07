import { NextResponse } from 'next/server'
import { getPrescriptionPatients, getPatients } from '@/actions/patients.actions'

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams
    const lookup = params.get('scope') === 'prescription' ? getPrescriptionPatients : getPatients
    return NextResponse.json(await lookup(params.get('q') || ''), { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    return NextResponse.json({ error: 'Patient search unavailable' }, { status: error instanceof Error && error.message === 'Unauthorized' ? 401 : 500 })
  }
}
