'use client'

import { useEffect, useState } from 'react'
import type { PrescriptionPatient } from '@/lib/prescription-patient'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function PatientPicker({ onSelect }: { onSelect: (patient: PrescriptionPatient) => void }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PrescriptionPatient[]>([])
  const [status, setStatus] = useState('')
  useEffect(() => {
    const controller = new AbortController()
    if (!query.trim()) { setResults([]); setStatus(''); return }
    setStatus('Searching…')
    const timer = setTimeout(async () => {
      try {
        const response = await fetch('/api/patients', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ q: query, scope: 'prescription' }), signal: controller.signal, cache: 'no-store', redirect: 'error' })
        if (!response.ok) throw new Error('Search unavailable')
        const patients: PrescriptionPatient[] = await response.json()
        if (!controller.signal.aborted) { setResults(patients); setStatus(patients.length ? '' : 'No patients found') }
      } catch {
        if (!controller.signal.aborted) setStatus('Search unavailable. Try again.')
      }
    }, 200)
    return () => { controller.abort(); clearTimeout(timer) }
  }, [query])
  return <div className="mt-4 space-y-2">
    <Input aria-label="Choose a patient by name or phone" placeholder="Find a patient by name or phone" value={query} onChange={event => setQuery(event.target.value)} />
    {status && <p role="status" className="text-sm text-muted-foreground">{status}</p>}
    <div className="max-h-64 overflow-y-auto space-y-1">{results.map(patient => <Button key={patient.id} variant="ghost" className="min-h-12 h-auto w-full justify-start whitespace-normal text-left" onClick={() => { onSelect(patient); setQuery(''); setResults([]) }}>{patient.name}{patient.phone ? ` · ${patient.phone}` : ''}</Button>)}</div>
  </div>
}
