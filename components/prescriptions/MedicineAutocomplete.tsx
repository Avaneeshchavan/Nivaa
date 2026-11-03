'use client'

import { useRef, useState } from 'react'
import { useDebouncedCallback } from 'use-debounce'
import { ChevronsUpDown, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useRxBuilderStore } from '@/stores/rxBuilderStore'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createCustomMedicine } from '@/actions/medicines.actions'
import type { Medicine } from '@/lib/generated/prisma/client'

export default function MedicineAutocomplete() {
  const [open, setOpen] = useState(false)
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

  const fetchMedicines = useDebouncedCallback(async (query: string, version: number) => {
    if (!query) {
      setMedicines([])
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/medicines?q=${encodeURIComponent(query)}`)
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
    fetchMedicines(value.trim(), ++searchVersion.current)
  }

  const handleCreate = async () => {
    if (creating || !search.trim()) return
    setCreating(true)
    setError(null)
    try {
      const medicine = await createCustomMedicine({ name: search, strength, form })
      setSelectedMed(medicine)
      setOpen(false)
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

  const handleAdd = () => {
    if (!selectedMed || !dosage.trim()) return
    
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
    setOpen(false)
  }

  return (
    <div className="space-y-4 bg-white p-4 rounded-lg border shadow-sm">
      <h3 className="font-semibold text-gray-800">Add Medicine</h3>
      
      {!selectedMed ? (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger
            role="combobox"
            aria-expanded={open}
            className="flex items-center justify-between w-full h-12 px-4 text-base font-normal bg-gray-50 border border-input rounded-md ring-offset-background hover:bg-accent hover:text-accent-foreground"
          >
            Search medicine...
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </PopoverTrigger>
          <PopoverContent className="w-[calc(100vw-2rem)] md:w-[400px] p-0" align="start">
            <Command shouldFilter={false}>
              <CommandInput 
                placeholder="Search by brand or generic..." 
                value={search}
                onValueChange={handleSearch}
                className="h-12 text-base"
              />
              <CommandList>
                {loading && <div className="p-4 text-sm text-gray-500 text-center">Searching...</div>}
                {!loading && search && medicines.length === 0 && (
                  <div className="p-3 text-sm text-gray-500">No medicines found.</div>
                )}
                {!loading && medicines.length > 0 && (
                  <CommandGroup>
                    {medicines.map((med) => (
                      <CommandItem
                        key={med.id}
                        value={med.name}
                        onSelect={() => {
                          setSelectedMed(med)
                          setOpen(false)
                        }}
                        className="min-h-11 py-3 cursor-pointer"
                      >
                        <div className="flex flex-col">
                          <span className="font-medium">{med.name}</span>
                          {(med.generic || med.form) && (
                            <span className="text-sm text-gray-500">
                              {med.generic} {med.form ? `• ${med.form}` : ''}
                            </span>
                          )}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
                {search.trim() && (
                  <CommandGroup heading="Custom medicine">
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
          </PopoverContent>
        </Popover>
      ) : (
        <div className="space-y-4 animate-in fade-in zoom-in duration-200" onKeyDown={event => {
          if (event.key === 'Enter' && !event.nativeEvent.isComposing && event.target instanceof HTMLInputElement) { event.preventDefault(); handleAdd() }
        }}>
          <div className="flex justify-between items-start bg-primary/5 p-3 rounded-md border border-primary/20">
            <div>
              <p className="font-semibold text-primary">{selectedMed.name}</p>
              <p className="text-xs text-gray-600">{selectedMed.generic}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setSelectedMed(null)} className="h-8">
              Change
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Dosage</label>
              <Input 
                autoFocus
                placeholder="e.g. 500mg, 1 tablet" 
                value={dosage} 
                onChange={(e) => setDosage(e.target.value)}
                className="h-12"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Frequency</label>
              <Select value={frequency} onValueChange={(val) => { if (val) setFrequency(val) }}>
                <SelectTrigger className="h-12">
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
              <label className="text-sm font-medium">Duration</label>
              <Input 
                placeholder="e.g. 5 Days, 1 Month" 
                value={duration} 
                onChange={(e) => setDuration(e.target.value)}
                className="h-12"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Instructions</label>
              <Input 
                placeholder="e.g. After food" 
                value={instructions} 
                onChange={(e) => setInstructions(e.target.value)}
                className="h-12"
              />
            </div>
          </div>

          <Button onClick={handleAdd} className="w-full h-12 gap-2" disabled={!dosage}>
            <Plus className="w-4 h-4" /> Add to Prescription
          </Button>
        </div>
      )}
    </div>
  )
}
