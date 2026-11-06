'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Activity, Users, FileText, ClipboardList, Settings, LogOut } from 'lucide-react'
import { useClinicStore } from '@/stores/clinicStore'
import { signOut } from '@/actions/auth.actions'
import { Button } from '@/components/ui/button'

export const clinicNavigation = [
  { name: 'Patients', short: 'Patients', href: '/patients', icon: Users },
  { name: 'New prescription', short: 'Prescribe', href: '/prescriptions/new', icon: FileText },
  { name: 'Templates', short: 'Templates', href: '/templates', icon: ClipboardList },
  { name: 'Settings', short: 'Settings', href: '/settings', icon: Settings },
]

export default function Sidebar() {
  const pathname = usePathname()
  const doctorName = useClinicStore(state => state.doctorName)
  const clinicName = useClinicStore(state => state.clinicName)
  const initials = doctorName?.trim().split(/\s+/).map(word => word[0]).join('').slice(0, 2).toUpperCase() || 'DR'

  return (
    <aside className="hidden lg:flex w-56 xl:w-64 shrink-0 flex-col border-r bg-sidebar">
      <Link href="/patients" className="m-4 mb-5 flex min-h-12 items-center gap-3 rounded-xl p-2">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground"><Activity aria-hidden="true" className="size-6" /></span>
        <span className="min-w-0"><span className="block text-xl font-semibold tracking-tight">Nivaa</span><span className="block truncate text-sm text-muted-foreground">{clinicName || 'Clinic workspace'}</span></span>
      </Link>

      <nav aria-label="Clinic navigation" className="flex-1 space-y-2 overflow-y-auto px-3">
        <p className="clinic-kicker px-3 pb-2">Workspace</p>
        {clinicNavigation.map(({ name, href, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link key={href} href={href} aria-current={active ? 'page' : undefined}
              className={`flex min-h-12 items-center gap-3 rounded-xl px-3 font-medium ${active ? 'bg-accent text-accent-foreground font-semibold' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
              <Icon aria-hidden="true" className="size-5 shrink-0" />{name}
            </Link>
          )
        })}
      </nav>

      <div className="space-y-3 border-t p-4">
        <div className="flex min-w-0 items-center gap-3">
          <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-full bg-secondary font-semibold text-secondary-foreground">{initials}</span>
          <div className="min-w-0"><p className="truncate font-semibold">{doctorName || 'Doctor'}</p><p className="text-sm text-muted-foreground">Signed in</p></div>
        </div>
        <Button variant="outline" className="w-full justify-start" onClick={() => signOut()}><LogOut aria-hidden="true" />Sign out</Button>
      </div>
    </aside>
  )
}
