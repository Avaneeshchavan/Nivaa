'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getPatients } from '@/actions/patients.actions'
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
    let cancelled = false
    setStatus('Searching…')
    const timer = setTimeout(() => {
      getPatients(query).then(result => { if (!cancelled) { setPatients(result); setStatus(result.length ? '' : 'No patients found') } })
        .catch(() => { if (!cancelled) { setPatients([]); setStatus('Search unavailable') } })
    }, 150)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [open, query])
  return <>
    <Button variant="outline" className="min-h-11" onClick={() => setOpen(true)}>Search patients <kbd className="hidden md:inline">⌘/Ctrl K</kbd></Button>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent>
      <DialogTitle>Find a patient</DialogTitle>
      <Input autoFocus className="h-12" aria-label="Search patients" placeholder="Name, phone, diagnosis, medicine" value={query} onChange={e => setQuery(e.target.value)} />
      <p role="status">{status}</p>
      <div className="max-h-80 overflow-y-auto">{patients.map(p => <Link key={p.id} className="flex min-h-11 items-center border-b py-2" href={`/patients/${p.id}`} onClick={() => setOpen(false)}>{p.name} · {p.phone}</Link>)}</div>
    </DialogContent></Dialog>
  </>
}
