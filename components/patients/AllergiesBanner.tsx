export default function AllergiesBanner({ allergies }: { allergies?: string | null }) {
  if (!allergies?.trim()) return null
  return (
    <div role="note" aria-label="Patient allergies" className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-900 whitespace-pre-wrap break-words">
      <span className="font-semibold">Allergies: </span>{allergies}
    </div>
  )
}
