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

  return (
    <HeaderProvider>
      <StoreInitializer
        doctorName={doctor?.name}
        clinicName={doctor?.clinicName}
        logoUrl={doctor?.logoUrl}
      />
      
      <div className="flex h-screen bg-gray-50 overflow-hidden">
        {/* Sidebar (iPad & Desktop) */}
        <Sidebar />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative pb-16 md:pb-0">
          <Header actionSlot={headerAction} />
          
          <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-safe">
            <div className="max-w-6xl mx-auto h-full">
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
