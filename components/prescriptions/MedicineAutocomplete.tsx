'use client'

import { useState } from 'react'
import { useDebouncedCallback } from 'use-debounce'
import { ChevronsUpDown, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
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
import { Medicine } from '@/lib/generated/prisma/client'

export default function MedicineAutocomplete() {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [medicines, setMedicines] = useState<Medicine[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedMed, setSelectedMed] = useState<Medicine | null>(null)

  const addMedicine = useRxBuilderStore((state) => state.addMedicine)

  const fetchMedicines = useDebouncedCallback(async (query: string) => {
    if (!query) {
      setMedicines([])
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/medicines?q=${encodeURIComponent(query)}`)
      const data = await res.json()
      setMedicines(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, 300)

  const handleSearch = (value: string) => {
    setSearch(value)
    fetchMedicines(value)
  }

  // Inline form state
  const [dosage, setDosage] = useState('')
  const [frequency, setFrequency] = useState('BD')
  const [duration, setDuration] = useState('5 Days')
  const [instructions, setInstructions] = useState('')

  const handleAdd = () => {
    if (!selectedMed) return
    
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
                  <CommandEmpty>No medicines found.</CommandEmpty>
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
                        className="py-3 cursor-pointer"
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
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      ) : (
        <div className="space-y-4 animate-in fade-in zoom-in duration-200">
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
