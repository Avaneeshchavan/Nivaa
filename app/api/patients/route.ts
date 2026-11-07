import { z } from 'zod'
import { NextResponse } from 'next/server'
import { getPrescriptionPatients, getPatients } from '@/actions/patients.actions'
import { readSmallJson } from '@/lib/security/request-json'

const headers = { 'Cache-Control': 'private, no-store' }
const searchSchema = z.object({ q: z.string().trim().max(100).default(''), scope: z.enum(['directory', 'prescription']).default('directory') })
export async function POST(request: Request) {
  try {
    const { q, scope } = searchSchema.parse(await readSmallJson(request))
    const lookup = scope === 'prescription' ? getPrescriptionPatients : getPatients
    return NextResponse.json(await lookup(q), { headers })
  } catch (error) {
    return NextResponse.json({ error: 'Patient search unavailable' }, { status: error instanceof Error && error.message === 'Unauthorized' ? 401 : 400, headers })
  }
}
