'use client'

import { useRef, useState } from 'react'
import { useDebouncedCallback } from 'use-debounce'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { useRxBuilderStore } from '@/stores/rxBuilderStore'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createCustomMedicine } from '@/actions/medicines.actions'
import type { Medicine } from '@/lib/generated/prisma/client'

export default function MedicineAutocomplete() {
  const [system, setSystem] = useState<'ALL' | 'ALLOPATHY' | 'AYURVEDIC'>('ALL')
  const [search, setSearch] = useState('')
  const [medicines, setMedicines] = useState<Medicine[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedMed, setSelectedMed] = useState<Medicine | null>(null)

  const [strength, setStrength] = useState('')
  const [form, setForm] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const searchVersion = useRef(0)

  const addMedicine = useRxBuilderStore((state) => state.addMedicine)

  const fetchMedicines = useDebouncedCallback(async (query: string, version: number, category: string) => {
    if (!query) {
      setMedicines([])
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/medicines?q=${encodeURIComponent(query)}&system=${category}`)
      const data = await res.json()
      if (!res.ok || !Array.isArray(data)) throw new Error('Medicine search failed. Try again.')
      if (version === searchVersion.current) setMedicines(data)
    } catch (err) {
      if (version === searchVersion.current) setError(err instanceof Error ? err.message : 'Medicine search failed')
    } finally {
      if (version === searchVersion.current) setLoading(false)
    }
  }, 300)

  const handleSearch = (value: string) => {
    setSearch(value)
    setError(null)
    setMedicines([])
    setLoading(Boolean(value.trim()))
    fetchMedicines(value.trim(), ++searchVersion.current, system)
  }

  const handleCreate = async () => {
    if (creating || !search.trim()) return
    setCreating(true)
    setError(null)
    try {
      const medicine = await createCustomMedicine({ name: search, strength, form, system: system === 'AYURVEDIC' ? 'AYURVEDIC' : 'ALLOPATHY' })
      chooseMedicine(medicine)
      setStrength('')
      setForm('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create medicine')
    } finally {
      setCreating(false)
    }
  }

  // Inline form state
  const [dosage, setDosage] = useState('')
  const [frequency, setFrequency] = useState('BD')
  const [duration, setDuration] = useState('5 Days')
  const [instructions, setInstructions] = useState('')

  const chooseMedicine = (medicine: Medicine) => {
    setSelectedMed(medicine)
    setDosage('')
    setFrequency(medicine.system === 'AYURVEDIC' ? '' : 'BD')
    setDuration(medicine.system === 'AYURVEDIC' ? '' : '5 Days')
    setInstructions('')
  }

  const handleAdd = () => {
    if (!selectedMed || !dosage.trim() || !frequency.trim() || !duration.trim()) return

    addMedicine({
      id: crypto.randomUUID(), // Temp ID for builder
      name: selectedMed.name,
      generic: selectedMed.generic,
      form: selectedMed.form,
      dosage,
      frequency,
      duration,
      instructions
    })

    // Reset form
    setSelectedMed(null)
    setSearch('')
    searchVersion.current += 1
    setMedicines([])
    setDosage('')
    setFrequency('BD')
    setDuration('5 Days')
    setInstructions('')
  }

  return (
    <div className="space-y-4">
      <label className="flex flex-wrap items-center gap-3 text-sm font-medium">Medicine system
        <select aria-label="Medicine system" className="min-h-11 rounded-lg border bg-card px-3" value={system}
          onChange={event => {
            const category = event.target.value as typeof system
            setSystem(category)
            setMedicines([])
            setLoading(Boolean(search.trim()))
            fetchMedicines(search.trim(), ++searchVersion.current, category)
          }}>
          <option value="ALL">All medicines</option><option value="ALLOPATHY">Allopathy</option><option value="AYURVEDIC">Ayurvedic</option>
        </select>
      </label>

      {!selectedMed ? (
        <Command shouldFilter={false} className="rounded-xl border border-input bg-card">
          <CommandInput
            aria-label="Search for a medicine"
            placeholder="Search by brand or generic name"
            value={search}
            onValueChange={handleSearch}
            className="h-12 text-base"
          />
          <CommandList className={!search.trim() ? 'hidden' : 'max-h-80'}>
            {loading && <div className="p-4 text-sm text-muted-foreground text-center">Searching...</div>}
            {!loading && search && medicines.length === 0 && (
              <div className="p-3 text-sm text-muted-foreground">No medicines found.</div>
            )}
            {!loading && medicines.length > 0 && (
              <CommandGroup>
                {medicines.map((med) => (
                  <CommandItem
                    key={med.id}
                    value={med.id}
                    onSelect={() => {
                      chooseMedicine(med)
                    }}
                    className="min-h-11 py-3 cursor-pointer"
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">{med.name} <span className="text-xs font-normal text-muted-foreground">· {med.system === 'AYURVEDIC' ? 'Ayurvedic' : 'Allopathy'}</span></span>
                      {(med.generic || med.form) && (
                        <span className="text-sm text-muted-foreground">
                          {med.generic} {med.form ? `• ${med.form}` : ''}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {search.trim() && (
              <CommandGroup heading={system === 'AYURVEDIC' ? 'Custom Ayurvedic medicine' : 'Custom allopathic medicine'}>
                <div className="grid grid-cols-2 gap-2 px-2 pb-2">
                  <Input aria-label="Custom medicine strength (optional)" placeholder="Strength (optional)" value={strength} onChange={(e) => setStrength(e.target.value)} maxLength={80} className="h-11" />
                  <Input aria-label="Custom medicine form (optional)" placeholder="Form (optional)" value={form} onChange={(e) => setForm(e.target.value)} maxLength={80} className="h-11" />
                </div>
                <CommandItem value="create-custom-medicine" onSelect={handleCreate} disabled={creating} className="min-h-11 py-3 cursor-pointer">
                  {creating ? 'Creating medicine...' : `Add '${search.trim()}' as custom medicine`}
                </CommandItem>
              </CommandGroup>
            )}
            {error && <p role="alert" className="p-3 text-sm text-red-600">{error}</p>}
          </CommandList>
        </Command>
      ) : (
        <div className="space-y-4 animate-in fade-in zoom-in duration-200" onKeyDown={event => {
          if (event.key === 'Enter' && !event.nativeEvent.isComposing && event.target instanceof HTMLInputElement) { event.preventDefault(); handleAdd() }
        }}>
          <div className="flex justify-between items-start bg-primary/5 p-3 rounded-md border border-primary/20">
            <div>
              <p className="font-semibold text-primary">{selectedMed.name}</p>
              <p className="text-sm text-muted-foreground">{selectedMed.generic}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setSelectedMed(null)} className="min-h-11">
              Change
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="rx-med-dosage" className="text-base font-medium">Dosage</label>
              <Input
                autoFocus
                placeholder="e.g. 500mg, 1 tablet"
                id="rx-med-dosage" value={dosage}
                onChange={(e) => setDosage(e.target.value)}
                className="h-12"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="rx-med-frequency" className="text-base font-medium">Frequency</label>
              <Select value={frequency} onValueChange={(val) => { if (val) setFrequency(val) }}>
                <SelectTrigger id="rx-med-frequency" className="h-12 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OD">OD (Once daily)</SelectItem>
                  <SelectItem value="BD">BD (Twice daily)</SelectItem>
                  <SelectItem value="TDS">TDS (Thrice daily)</SelectItem>
                  <SelectItem value="QID">QID (Four times daily)</SelectItem>
                  <SelectItem value="SOS">SOS (As needed)</SelectItem>
                  <SelectItem value="HS">HS (At bedtime)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label htmlFor="rx-med-duration" className="text-base font-medium">Duration</label>
              <Input
                placeholder="e.g. 5 Days, 1 Month"
                id="rx-med-duration" value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="h-12"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="rx-med-instructions" className="text-base font-medium">Instructions</label>
              <Input
                placeholder="e.g. After food"
                id="rx-med-instructions" value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                className="h-12"
              />
            </div>
          </div>

          <Button onClick={handleAdd} className="w-full h-12 gap-2" disabled={!dosage.trim() || !frequency.trim() || !duration.trim()}>
            <Plus className="w-4 h-4" /> Add to Prescription
          </Button>
        </div>
      )}
    </div>
  )
}
