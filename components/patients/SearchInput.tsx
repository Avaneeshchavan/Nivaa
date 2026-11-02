'use client'

import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useDebouncedCallback } from 'use-debounce'

export default function SearchInput({ onSearch }: { onSearch?: (term: string) => void }) {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()

  const handleSearch = useDebouncedCallback((term: string) => {
    const params = new URLSearchParams(searchParams)
    if (term) {
      params.set('q', term)
    } else {
      params.delete('q')
    }
    if (onSearch) {
      onSearch(term)
      window.history.replaceState(null, '', `${pathname}?${params.toString()}`)
    } else {
      router.replace(`${pathname}?${params.toString()}`)
    }
  }, 150)

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
      <Input
        type="search"
        placeholder="Name, phone, diagnosis or medicine..."
        className="pl-10 h-12 text-base rounded-full border-gray-300 bg-white"
        defaultValue={searchParams.get('q')?.toString()}
        onChange={(e) => handleSearch(e.target.value)}
      />
    </div>
  )
}
