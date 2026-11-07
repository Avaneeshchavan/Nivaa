'use client'
import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'

export default function PatientSearch() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [patients, setPatients] = useState<{ id: string; name: string; phone: string | null }[]>([])
  const [status, setStatus] = useState('')
  useEffect(() => {
    const hotkey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setOpen(value => !value) }
    }
    window.addEventListener('keydown', hotkey)
    return () => window.removeEventListener('keydown', hotkey)
  }, [])
  useEffect(() => {
    if (!open) { setPatients([]); setQuery(''); return }
    const controller = new AbortController()
    setStatus('Searching…')
    const timer = setTimeout(() => {
      fetch(`/api/patients?q=${encodeURIComponent(query)}`, { signal: controller.signal, cache: 'no-store', redirect: 'error' })
        .then(response => { if (!response.ok) throw new Error('Search unavailable'); return response.json() })
        .then(result => { if (!controller.signal.aborted) { setPatients(result); setStatus(result.length ? '' : 'No patients found') } })
        .catch(() => { if (!controller.signal.aborted) { setPatients([]); setStatus('Search unavailable') } })
    }, 150)
    return () => { controller.abort(); clearTimeout(timer) }
  }, [open, query])
  return <>
    <Button variant="outline" className="min-h-11 px-3" aria-label="Find a patient" onClick={() => setOpen(true)}><Search aria-hidden="true" /><span className="hidden sm:inline">Find patient</span><kbd className="hidden xl:inline rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">⌘ / Ctrl K</kbd></Button>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent>
      <DialogTitle>Find a patient</DialogTitle>
      <Input autoFocus className="h-12" aria-label="Search patients" placeholder="Name, phone, diagnosis, medicine" value={query} onChange={e => setQuery(e.target.value)} />
      <p role="status">{status}</p>
      <div className="max-h-80 overflow-y-auto">{patients.map(p => <Link key={p.id} className="flex min-h-11 items-center border-b py-2" href={`/patients/${p.id}`} onClick={() => setOpen(false)}>{p.name} · {p.phone}</Link>)}</div>
    </DialogContent></Dialog>
  </>
}
