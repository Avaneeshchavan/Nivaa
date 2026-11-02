'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Users, FileText, ClipboardList, Settings, LogOut } from 'lucide-react'
import { useClinicStore } from '@/store/clinicStore'
import { signOut } from '@/actions/auth.actions'
import { Button } from '@/components/ui/button'

const NAV_ITEMS = [
  { name: 'Patients', href: '/patients', icon: Users },
  { name: 'New Prescription', href: '/prescriptions/new', icon: FileText },
  { name: 'Templates', href: '/templates', icon: ClipboardList },
  { name: 'Settings', href: '/settings', icon: Settings },
]

export default function Sidebar() {
  const pathname = usePathname()
  const doctorName = useClinicStore((state) => state.doctorName)

  const getInitials = (name: string | null) => {
    if (!name) return 'DR'
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2)
  }

  return (
    <div className="hidden md:flex w-64 flex-col bg-white border-r h-full overflow-hidden">
      <div className="p-6 border-b">
        <h1 className="text-2xl font-bold text-primary">Clinic App</h1>
      </div>

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname.startsWith(item.href)
          const Icon = item.icon
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-4 min-h-12 rounded-lg transition-colors ${
                isActive
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{item.name}</span>
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t bg-gray-50">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold">
            {getInitials(doctorName)}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-medium truncate">{doctorName || 'Doctor'}</p>
          </div>
        </div>
        <Button
          variant="outline"
          className="w-full justify-start gap-2 text-gray-600 h-10"
          onClick={() => signOut()}
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </Button>
      </div>
    </div>
  )
}
