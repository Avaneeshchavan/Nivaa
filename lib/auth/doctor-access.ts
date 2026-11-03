import { z } from 'zod'

// Server/Edge configuration only. Never expose this as NEXT_PUBLIC_*.
export function isAllowedDoctorEmail(email: string | undefined | null) {
  const configured = (process.env.ALLOWED_DOCTOR_EMAILS || '').split(',').map(value => value.trim().toLowerCase())
  if (configured.length !== 2 || new Set(configured).size !== 2 || configured.some(value => !z.email().safeParse(value).success)) return false
  return typeof email === 'string' && configured.includes(email.trim().toLowerCase())
}

export function isAllowedDoctorUser(user: { email?: string; email_confirmed_at?: string } | null) {
  return Boolean(user?.email_confirmed_at && isAllowedDoctorEmail(user.email))
}
