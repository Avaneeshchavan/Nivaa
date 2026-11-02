'use server'

import { createClient } from '@/lib/supabase/server'
import prisma from '@/lib/prisma'
import { redirect } from 'next/navigation'

export async function getCurrentDoctor() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return null
  }

  try {
    // Assuming a 'doctor' model exists in Prisma with 'supabaseId'
    // You'll need to define this in your schema.prisma
    const doctor = await prisma.doctor.findUnique({
      where: {
        supabaseId: user.id
      }
    })

    return doctor
  } catch (err) {
    console.error('Error fetching doctor:', err)
    return null
  }
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

