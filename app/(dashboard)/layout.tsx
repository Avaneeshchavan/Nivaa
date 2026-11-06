import { redirect } from 'next/navigation'
import { ReactNode } from 'react'
import { getCurrentDoctor } from '@/actions/auth.actions'
import StoreInitializer from '@/components/StoreInitializer'
import Sidebar from '@/components/dashboard/Sidebar'
import BottomNav from '@/components/dashboard/BottomNav'
import Header from '@/components/dashboard/Header'
import { HeaderProvider } from '@/components/dashboard/HeaderContext'

interface DashboardLayoutProps {
  children: ReactNode
  headerAction: ReactNode
}

export default async function DashboardLayout({
  children,
  headerAction,
}: DashboardLayoutProps) {
  const doctor = await getCurrentDoctor()
  if (!doctor) redirect('/login')

  return (
    <HeaderProvider>
      <StoreInitializer
        doctorName={doctor?.name}
        clinicName={doctor?.clinicName}
        logoUrl={doctor?.logoUrl}
      />
      
      <div className="flex h-dvh bg-background overflow-hidden">
        {/* Sidebar (iPad & Desktop) */}
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:rounded-lg focus:bg-card focus:p-3">Skip to main content</a>
        <Sidebar />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative pb-[calc(4.25rem+env(safe-area-inset-bottom))] lg:pb-0">
          <Header actionSlot={headerAction} />
          
          <main id="main-content" tabIndex={-1} className="flex-1 overflow-y-auto px-4 py-5 sm:px-7 sm:py-7 lg:px-8">
            <div className="max-w-[90rem] mx-auto min-w-0">
              {children}
            </div>
          </main>
        </div>

        {/* Bottom Navigation (Mobile only) */}
        <BottomNav />
      </div>
    </HeaderProvider>
  )
}
