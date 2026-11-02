import { NextResponse } from 'next/server'
import { getPatients } from '@/actions/patients.actions'

export async function GET(request: Request) {
  try {
    return NextResponse.json(await getPatients(new URL(request.url).searchParams.get('q') || ''), { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    return NextResponse.json({ error: 'Patient search unavailable' }, { status: error instanceof Error && error.message === 'Unauthorized' ? 401 : 500 })
  }
}
