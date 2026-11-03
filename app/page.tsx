import { redirect } from 'next/navigation'
import { getCurrentDoctor } from '@/actions/auth.actions'

export default async function Home() {
  const doctor = await getCurrentDoctor()

  redirect(doctor ? '/patients' : '/login')
}
