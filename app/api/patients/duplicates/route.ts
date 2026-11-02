import { NextResponse } from 'next/server'
import { findDuplicatePatients } from '@/actions/patients.actions'

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams
    return NextResponse.json(await findDuplicatePatients(params.get('name') || '', params.get('phone') || ''), { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    return NextResponse.json({ error: 'Duplicate check unavailable' }, { status: error instanceof Error && error.message === 'Unauthorized' ? 401 : 500 })
  }
}
