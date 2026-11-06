'use client'

import { usePathname } from 'next/navigation'
import { Activity, LogOut } from 'lucide-react'
import { signOut } from '@/actions/auth.actions'
import { Button } from '@/components/ui/button'
import PatientSearch from './PatientSearch'

export default function Header({ actionSlot }: { actionSlot?: React.ReactNode }) {
  const pathname = usePathname()
  const section = pathname.startsWith('/patients') ? 'Patient records'
    : pathname.startsWith('/prescriptions') ? 'Prescriptions'
    : pathname.startsWith('/templates') ? 'Templates' : 'Settings'

  return (
    <header className="z-30 flex shrink-0 items-center justify-between gap-2 border-b bg-card px-4 pt-safe sm:px-7 lg:px-8">
      <div className="flex min-h-16 min-w-0 items-center gap-2 sm:gap-3">
        <Activity aria-hidden="true" className="size-5 shrink-0 text-primary lg:hidden" />
        <span className="truncate font-semibold">{section}</span>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <PatientSearch />
        {actionSlot}
        <Button variant="outline" size="icon" className="lg:hidden" aria-label="Sign out" onClick={() => signOut()}><LogOut aria-hidden="true" /></Button>
      </div>
    </header>
  )
}
