import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentDoctor } from '@/actions/auth.actions'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim().slice(0, 100)
  const system = searchParams.get('system')

  const doctor = await getCurrentDoctor()
  if (!doctor) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!q) {
    return NextResponse.json([])
  }

  try {
    const medicines = await prisma.medicine.findMany({
      where: {
        ...(system === 'AYURVEDIC' || system === 'ALLOPATHY' ? { system } : {}),
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { generic: { contains: q, mode: 'insensitive' } },
        ],
      },
      take: 10,
      orderBy: { name: 'asc' },
    })

    const response = NextResponse.json(medicines)
    // Cache for 5 minutes since medicine DB doesn't change often
    response.headers.set('Cache-Control', 'private, max-age=300')
    return response
  } catch (error) {
    console.error('Medicine search failed')
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
