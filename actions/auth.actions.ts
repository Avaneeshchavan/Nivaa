'use server'

import { createClient } from '@/lib/supabase/server'
import prisma from '@/lib/prisma'
import { z } from 'zod'
import { isAllowedDoctorEmail, isAllowedDoctorUser } from '@/lib/auth/doctor-access'
import { redirect } from 'next/navigation'
import { cache } from 'react'

// React cache lives for one server render, never across doctors or requests.
const resolveCurrentDoctor = cache(async () => {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user || !isAllowedDoctorUser(user)) {
    return null
  }

  try {
    const doctor = await prisma.doctor.findUnique({
      where: {
        supabaseId: user.id
      }
    })

    return doctor && doctor.email.trim().toLowerCase() === user.email?.trim().toLowerCase() ? doctor : null
  } catch (err) {
    console.error('Error fetching doctor:', err)
    return null
  }
})

export async function getCurrentDoctor() {
  return resolveCurrentDoctor()
}

const signInSchema = z.object({ email: z.string().trim().toLowerCase().max(254).pipe(z.email()), password: z.string().min(6).max(1024) })

export async function signIn(input: { email: string; password: string }) {
  const parsed = signInSchema.safeParse(input)
  const denied = { error: 'Unable to sign in with these credentials.' }
  if (!parsed.success || !isAllowedDoctorEmail(parsed.data.email)) return denied
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword(parsed.data)
  if (error) return denied
  if (!await getCurrentDoctor()) {
    await supabase.auth.signOut()
    return denied
  }
  return { error: null }
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export async function updateDoctorProfile(data: {
  name?: string | null
  license?: string | null
  clinicName?: string | null
  address?: string | null
  phone?: string | null
  logoUrl?: string | null
}) {
  const doctor = await getCurrentDoctor()
  if (!doctor) throw new Error('Unauthorized')

  const updated = await prisma.doctor.update({
    where: { id: doctor.id },
    data: {
      name: data.name,
      license: data.license,
      clinicName: data.clinicName,
      address: data.address,
      phone: data.phone,
      logoUrl: data.logoUrl
    }
  })

  return updated
}

