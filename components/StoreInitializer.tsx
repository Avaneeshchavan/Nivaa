'use client'

import { useEffect, useRef } from 'react'
import { useClinicStore } from '@/store/clinicStore'

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
  const initialized = useRef(false)
  const setClinicData = useClinicStore((state) => state.setClinicData)

  useEffect(() => {
    if (!initialized.current) {
      setClinicData({ doctorName, clinicName, logoUrl })
      initialized.current = true
    }
  }, [doctorName, clinicName, logoUrl, setClinicData])

  return null
}
