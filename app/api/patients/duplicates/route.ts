import { z } from 'zod'
import { NextResponse } from 'next/server'
import { findDuplicatePatients } from '@/actions/patients.actions'
import { readSmallJson } from '@/lib/security/request-json'

const headers = { 'Cache-Control': 'private, no-store' }
const duplicateSchema = z.object({ name: z.string().max(160), phone: z.string().max(40) })
export async function POST(request: Request) {
  try {
    const { name, phone } = duplicateSchema.parse(await readSmallJson(request))
    return NextResponse.json(await findDuplicatePatients(name, phone), { headers })
  } catch (error) {
    return NextResponse.json({ error: 'Duplicate check unavailable' }, { status: error instanceof Error && error.message === 'Unauthorized' ? 401 : 400, headers })
  }
}
