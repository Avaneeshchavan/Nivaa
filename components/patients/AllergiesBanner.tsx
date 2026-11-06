import { TriangleAlert } from 'lucide-react'

export default function AllergiesBanner({ allergies }: { allergies?: string | null }) {
  if (!allergies?.trim()) return null
  return (
    <div role="note" aria-label="Patient allergies" className="flex items-start gap-3 rounded-xl border border-red-300 bg-red-50 p-4 text-red-950">
      <TriangleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-red-800" />
      <div className="min-w-0"><p className="font-semibold">Allergies</p><p className="mt-1 whitespace-pre-wrap break-words">{allergies}</p></div>
    </div>
  )
}
