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

// Older deployed clients can finish their session. New UI sends search text in POST bodies.
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams
  const input = searchSchema.safeParse({ q: params.get('q') || '', scope: params.get('scope') || 'directory' })
  if (!input.success) return NextResponse.json({ error: 'Invalid search' }, { status: 400, headers })
  try {
    const lookup = input.data.scope === 'prescription' ? getPrescriptionPatients : getPatients
    return NextResponse.json(await lookup(input.data.q), { headers })
  } catch { return NextResponse.json({ error: 'Patient search unavailable' }, { status: 401, headers }) }
}
