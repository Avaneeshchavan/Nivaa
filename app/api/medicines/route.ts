import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentDoctor } from '@/actions/auth.actions'
import { brandSearchSql, mapBrandResults, searchArguments } from '@/lib/medicines/search'
import type { Brand, DoctorMedicinePref } from '@/lib/generated/prisma/client'

export async function GET(request: Request) {
  const started = performance.now()
  const doctor = await getCurrentDoctor()
  const authMs = performance.now() - started
  const headers = { 'Cache-Control': 'private, no-store' }
  if (!doctor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers })
  try {
    const params = new URL(request.url).searchParams
    const rows = await prisma.$queryRawUnsafe<(Brand & { pref: DoctorMedicinePref | null })[]>(brandSearchSql,
      ...searchArguments(params.get('q') || '', doctor.id, params.get('system') || 'ALL'))
    return NextResponse.json(mapBrandResults(rows), { headers: { ...headers, 'Server-Timing': `auth;dur=${authMs.toFixed(1)},catalog;dur=${(performance.now()-started-authMs).toFixed(1)}` } })
  } catch {
    return NextResponse.json({ error: 'Medicine search unavailable' }, { status: 503, headers })
  }
}
