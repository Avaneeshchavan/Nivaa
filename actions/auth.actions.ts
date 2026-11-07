'use server'

import { createClient } from '@/lib/supabase/server'
import prisma from '@/lib/prisma'
import { z } from 'zod'
import { isAllowedDoctorEmail, isAllowedDoctorUser } from '@/lib/auth/doctor-access'
import { redirect } from 'next/navigation'
import { recordAudit } from '@/lib/security/audit'
import { consumeRateLimit } from '@/lib/security/rate-limit'
import { profileSchema } from '@/lib/validations/profile.schema'
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

    return doctor && doctor.active && doctor.email.trim().toLowerCase() === user.email?.trim().toLowerCase() ? doctor : null
  } catch (err) {
    console.error('Doctor lookup failed')
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
  try {
    if (!await consumeRateLimit('login', parsed.data.email, 10, 600)) return denied
  } catch { return denied }
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword(parsed.data)
  if (error) return denied
  const doctor = await getCurrentDoctor()
  if (!doctor) {
    await supabase.auth.signOut()
    return denied
  }
  try { await recordAudit(doctor.id, 'LOGIN') }
  catch { await supabase.auth.signOut(); return denied }
  return { error: null }
}

export async function signOut() {
  const doctor = await getCurrentDoctor()
  if (doctor) {
    try { await recordAudit(doctor.id, 'LOGOUT') } catch { console.error('Logout audit unavailable') }
  }
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

  data = profileSchema.parse(data)
  if (data.logoUrl) {
    const logo = new URL(data.logoUrl)
    const allowed = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!)
    const validPath = [doctor.supabaseId, doctor.id].some(id =>
      ['png', 'jpg', 'jpeg'].some(extension => logo.pathname === `/storage/v1/object/public/logos/${id}/logo.${extension}`))
    if (logo.protocol !== 'https:' || logo.origin !== allowed.origin || !validPath || logo.search || logo.hash || logo.username || logo.password) throw new Error('Invalid clinic logo')
  }
  const updated = await prisma.$transaction(async tx => {
    const profile = await tx.doctor.update({ where: { id: doctor.id }, data })
    await recordAudit(doctor.id, 'PROFILE_UPDATE', doctor.id, tx)
    return profile
  })

  return updated
}

