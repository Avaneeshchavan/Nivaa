'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Users, FileText, Settings } from 'lucide-react'

const NAV_ITEMS = [
  { name: 'Patients', href: '/patients', icon: Users },
  { name: 'Prescribe', href: '/prescriptions/new', icon: FileText },
  { name: 'Settings', href: '/settings', icon: Settings },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t pb-safe flex justify-around items-center h-16 z-50">
      {NAV_ITEMS.map((item) => {
        const isActive = pathname.startsWith(item.href)
        const Icon = item.icon
        return (
          <Link
            key={item.name}
            href={item.href}
            className={`flex flex-col items-center justify-center w-full min-h-12 ${
              isActive ? 'text-primary' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <Icon className="w-5 h-5 mb-1" />
            <span className="text-[10px] font-medium">{item.name}</span>
          </Link>
        )
      })}
    </div>
  )
}
