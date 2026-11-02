'use client'

import { useEffect } from 'react'
import { Button } from './button'

export default function Toast({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 6000)
    return () => clearTimeout(timer)
  }, [message, onDismiss])

  return (
    <div role="status" className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:max-w-md z-50 flex items-center gap-3 rounded-lg bg-gray-900 p-4 text-white shadow-lg">
      <span className="flex-1">{message}</span>
      <Button variant="ghost" className="min-h-11" onClick={onDismiss} aria-label="Dismiss notification">Close</Button>
    </div>
  )
}
