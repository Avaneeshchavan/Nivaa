'use client'

import { buttonVariants } from '@/components/ui/button'
import SearchInput from './SearchInput'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, CalendarDays, FileText, Phone, Plus, Users } from 'lucide-react'
import { format } from 'date-fns'


interface DirectoryPatient {
  id: string
  name: string
  phone: string | null
  visits: { date: Date | string }[]
}

export default function PatientDirectory({ initialPatients }: { initialPatients: DirectoryPatient[] }) {
  const [patients, setPatients] = useState(initialPatients)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const request = useRef<AbortController | null>(null)
  useEffect(() => () => request.current?.abort(), [])
  const handleSearch = async (term: string) => {
    request.current?.abort()
    const controller = new AbortController()
    request.current = controller
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/patients', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ q: term }), signal: controller.signal, cache: 'no-store', redirect: 'error' })
      if (!response.ok) throw new Error('Search failed. Please try again.')
      const data: DirectoryPatient[] = await response.json()
      if (!controller.signal.aborted) setPatients(data)
    } catch {
      if (!controller.signal.aborted) setError('Patient search is unavailable. Please try again.')
    } finally {
      if (!controller.signal.aborted) setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-end justify-between gap-4 rounded-2xl border bg-gradient-to-br from-card to-secondary p-5 sm:p-8">
        <div>
          <p className="clinic-kicker mb-2">Clinic workspace</p>
          <h1 className="clinic-heading">Patients</h1>
          <p className="mt-2 text-base text-muted-foreground">Find a patient, review their visits, or start a prescription.</p>
        </div>
        <Link href="/patients/new" className={buttonVariants({ size: 'lg' })}><Plus aria-hidden="true" />Add patient</Link>
      </section>

      <section aria-labelledby="patient-directory" className="clinic-panel min-w-0">
        <div className="space-y-4 border-b p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="patient-directory" className="text-xl font-semibold">Patient directory</h2>
            <p role="status" className="rounded-full bg-muted px-3 py-1 text-sm font-medium text-muted-foreground">
              {loading ? 'Searching…' : patients.length === 50 ? '50 results · refine your search' : `${patients.length} ${patients.length === 1 ? 'patient' : 'patients'}`}
            </p>
          </div>
          <SearchInput onSearch={handleSearch} />
          {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-900">{error}</p>}
        </div>

        {patients.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-5 py-12 text-center">
            <span className="grid size-14 place-items-center rounded-2xl bg-secondary text-primary"><Users aria-hidden="true" /></span>
            <h3 className="text-xl font-semibold">{loading ? 'Looking up patients' : 'No patients found'}</h3>
            <p className="text-muted-foreground">Search by a different name or add a patient to begin.</p>
          </div>
        ) : (
          <ul aria-busy={loading} className="divide-y">
            {patients.map(patient => {
              const lastVisit = patient.visits[0]
              const initials = patient.name.trim().split(/\s+/).map(word => word[0]).join('').slice(0, 2).toUpperCase()
              return (
                <li key={patient.id} className="flex flex-wrap items-center gap-2 px-4 py-3 sm:px-6">
                  <Link href={`/patients/${patient.id}`} className="group flex min-h-16 min-w-0 flex-1 basis-52 items-center gap-3 rounded-xl py-2 hover:bg-muted sm:px-2">
                    <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-full bg-accent font-semibold text-primary">{initials}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block break-words text-lg font-semibold">{patient.name}</span>
                      <span className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5"><Phone aria-hidden="true" className="size-4" />{patient.phone || 'No phone'}</span>
                        <span className="inline-flex items-center gap-1.5"><CalendarDays aria-hidden="true" className="size-4" />{lastVisit ? `Last visit ${format(new Date(lastVisit.date), 'dd MMM yyyy')}` : 'No visits yet'}</span>
                      </span>
                    </span>
                    <ArrowRight aria-hidden="true" className="mr-2 size-5 shrink-0 text-primary" />
                  </Link>
                  <Link aria-label={`New prescription for ${patient.name}`} href={`/prescriptions/new?patientId=${patient.id}`} className={buttonVariants({ variant: 'secondary', className: 'max-sm:ml-14' })}>
                    <FileText aria-hidden="true" />New Rx
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
