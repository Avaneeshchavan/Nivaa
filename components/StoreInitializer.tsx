'use client'

import { useEffect } from 'react'
import { useClinicStore } from '@/stores/clinicStore'

interface StoreInitializerProps {
  doctorName?: string | null
  clinicName?: string | null
  logoUrl?: string | null
}

export default function StoreInitializer({
  doctorName,
  clinicName,
  logoUrl,
}: StoreInitializerProps) {
  const setClinicData = useClinicStore((state) => state.setClinicData)

  useEffect(() => {
    setClinicData({
      doctorName: doctorName ?? null,
      clinicName: clinicName ?? null,
      logoUrl: logoUrl ?? null,
    })
  }, [doctorName, clinicName, logoUrl, setClinicData])

  return null
}
