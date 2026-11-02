'use client'

import { useHeader } from './HeaderContext'

interface HeaderProps {
  actionSlot?: React.ReactNode
}

export default function Header({ actionSlot }: HeaderProps) {
  const { title } = useHeader()

  return (
    <header className="h-16 border-b bg-white flex items-center justify-between px-4 md:px-6 sticky top-0 z-40 pt-safe">
      <h2 className="text-xl font-semibold text-gray-800 truncate">{title}</h2>
      {actionSlot && <div className="flex-shrink-0">{actionSlot}</div>}
    </header>
  )
}
