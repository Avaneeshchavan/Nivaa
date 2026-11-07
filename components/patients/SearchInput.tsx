'use client'

import { useEffect } from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { usePathname, useSearchParams } from 'next/navigation'
import { useDebouncedCallback } from 'use-debounce'

export default function SearchInput({ onSearch }: { onSearch: (term: string) => void }) {
  const searchParams = useSearchParams()
  const pathname = usePathname()

  useEffect(() => {
    if (searchParams.has('q')) window.history.replaceState(null, '', pathname)
  }, [pathname, searchParams])

  const handleSearch = useDebouncedCallback((term: string) => {
    onSearch(term)
  }, 150)

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
      <Input
        type="search"
        aria-label="Search patient records"
        placeholder="Name, phone, diagnosis or medicine..."
        className="pl-10 h-12 text-base rounded-xl border-input bg-white"
        onChange={(e) => handleSearch(e.target.value)}
      />
    </div>
  )
}
