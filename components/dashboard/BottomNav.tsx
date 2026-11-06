'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { clinicNavigation } from './Sidebar'

export default function BottomNav() {
  const pathname = usePathname()
  return (
    <nav aria-label="Clinic navigation" className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-4 border-t bg-sidebar px-1 pt-1 pb-safe lg:hidden">
      {clinicNavigation.map(({ short, href, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(href + '/')
        return <Link key={href} href={href} aria-current={active ? 'page' : undefined}
          className={`mx-0.5 mb-1 flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-xs sm:text-sm font-semibold ${active ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-muted'}`}>
          <Icon aria-hidden="true" className="size-5" />{short}
        </Link>
      })}
    </nav>
  )
}
