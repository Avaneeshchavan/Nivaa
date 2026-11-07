'use client'

import { useEffect, useRef, useState } from 'react'
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
import { useRxBuilderStore, type RxMedicine } from '@/stores/rxBuilderStore'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import CustomMedicineForm from './CustomMedicineForm'
import type { BrandChoice } from '@/lib/medicines/brand'
import { rememberMedicineUse, setMedicineFavorite } from '@/actions/brand-preferences.actions'

export default function MedicineAutocomplete({ onAdd }: { onAdd?: (medicine: RxMedicine) => void } = {}) {
  const [system, setSystem] = useState<'ALL' | 'ALLOPATHY' | 'AYURVEDIC' | 'OTHER'>('ALL')
  const [search, setSearch] = useState('')
  const [medicines, setMedicines] = useState<BrandChoice[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedMed, setSelectedMed] = useState<BrandChoice | null>(null)

  const [customName, setCustomName] = useState<string | null>(null)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState<string | null>(null)
  const searchVersion = useRef(0)
  const requestRef = useRef<AbortController | null>(null)
  const [favoriteBusy, setFavoriteBusy] = useState(false)

  const addMedicine = useRxBuilderStore((state) => state.addMedicine)

  const fetchMedicines = useDebouncedCallback(async (query: string, version: number, category: string) => {
    requestRef.current?.abort()
    const controller = new AbortController()
    requestRef.current = controller
    setLoading(true)
    try {
      const res = await fetch(`/api/medicines?q=${encodeURIComponent(query)}&system=${category}`, { signal: controller.signal, cache: 'no-store', redirect: 'error' })
      const data = await res.json()
      if (!res.ok || !Array.isArray(data)) throw new Error('Medicine search failed. Try again.')
      if (version === searchVersion.current) setMedicines(data)
    } catch {
      if (!controller.signal.aborted && version === searchVersion.current) setError('Medicine search unavailable. Try again.')
    } finally {
      if (version === searchVersion.current) setLoading(false)
    }
  }, 100)
  useEffect(() => () => { requestRef.current?.abort(); fetchMedicines.cancel() }, [fetchMedicines])

  const handleSearch = (value: string) => {
    requestRef.current?.abort()
    setSearch(value)
    setError(null)
    setNotice('')
    setMedicines([])
    setLoading(Boolean(value.trim()))
    fetchMedicines(value.trim(), ++searchVersion.current, system)
  }

  // Inline form state
  const [dosage, setDosage] = useState('')
  const [frequency, setFrequency] = useState('BD')
  const [duration, setDuration] = useState('5 Days')
  const [instructions, setInstructions] = useState('')

  const chooseMedicine = (medicine: BrandChoice) => {
    setSelectedMed(medicine)
    setDosage(medicine.defaults?.defaultDosage || '')
    setFrequency(medicine.defaults?.defaultFrequency || '')
    setDuration(medicine.defaults?.defaultDuration || '')
    setInstructions(medicine.defaults?.defaultInstruction || '')
  }

  const handleAdd = () => {
    if (!selectedMed || !dosage.trim() || !frequency.trim() || !duration.trim()) return

    const commitMedicine = onAdd || addMedicine
    commitMedicine({
      id: crypto.randomUUID(), // Temp ID for builder
      brandId: selectedMed.brandId,
      manufacturer: selectedMed.manufacturer,
      strengthText: selectedMed.strengthText,
      composition: selectedMed.composition,
      name: selectedMed.name,
      generic: selectedMed.generic,
      form: selectedMed.form,
      dosage,
      frequency,
      duration,
      instructions
    })

    if (!onAdd && selectedMed.brandId) void rememberMedicineUse({ brandId: selectedMed.brandId, dosage, frequency, duration, instructions })
      .catch(() => setNotice('Medicine added. Usual entries could not be remembered; try again next time.'))

    // Reset form
    setSelectedMed(null)
    setNotice('')
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
      {!selectedMed && customName === null && <div role="group" aria-label="Optional medicine filter" className="flex flex-wrap gap-2">
        {([['ALL', 'All medicines'], ['ALLOPATHY', 'Allopathy'], ['AYURVEDIC', 'AYUSH'], ['OTHER', 'Unclassified']] as const).map(([category, label]) => (
          <Button key={category} type="button" size="sm" variant={system === category ? 'default' : 'outline'}
            className="min-h-11 rounded-full" aria-pressed={system === category}
            onClick={() => {
              setSystem(category)
              setMedicines([])
              setLoading(Boolean(search.trim()))
              fetchMedicines(search.trim(), ++searchVersion.current, category)
            }}>{label}</Button>
        ))}
      </div>}

      {error && <p role="alert" className="text-sm text-red-900">{error}</p>}
      {notice && <p role="status" className="rounded-lg border bg-secondary p-3 text-sm font-medium">{notice}</p>}
      {customName !== null ? <CustomMedicineForm initialName={customName} initialSystem={system === 'AYURVEDIC' ? 'AYURVEDIC' : 'ALLOPATHY'}
        onCancel={() => setCustomName(null)} onCreated={({ medicine, alreadyExists }) => {
          setCustomName(null)
          setNotice(alreadyExists ? `Already exists: ${medicine.name}` : `Added: ${medicine.name}`)
          chooseMedicine(medicine)
        }} /> : !selectedMed ? (
        <Command shouldFilter={false} className="rounded-xl border border-input bg-card">
          <CommandInput
            aria-label="Search for a medicine"
            placeholder="Search by brand or generic name"
            value={search}
            onValueChange={handleSearch}
            onFocus={() => fetchMedicines(search.trim(), ++searchVersion.current, system)}
            className="h-12 text-base"
          />
          <CommandList className="max-h-80">
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
                      <span className="font-medium">{med.isFavorite ? '★ ' : ''}{med.name} <span className="inline-block rounded-full bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground">{med.system === 'AYURVEDIC' ? 'AYUSH' : med.system === 'OTHER' ? 'Unclassified' : 'Allopathy'}</span></span>
                      {(med.generic || med.form || med.manufacturer) && (
                        <span className="text-sm text-muted-foreground">
                          {[med.generic, med.form, med.manufacturer].filter(Boolean).join(' · ')}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {search.trim() && (
              <CommandGroup heading="Not found?">
                <CommandItem value="create-custom-medicine" onSelect={() => setCustomName(search.trim())} className="min-h-11 py-3 cursor-pointer">
                  {`Add '${search.trim()}' as custom medicine`}
                </CommandItem>
              </CommandGroup>
            )}

          </CommandList>
        </Command>
      ) : (
        <div className="space-y-4 animate-in fade-in zoom-in duration-200" onKeyDown={event => {
          if (event.key === 'Enter' && !event.nativeEvent.isComposing && event.target instanceof HTMLInputElement) { event.preventDefault(); handleAdd() }
        }}>
          <div className="flex justify-between items-start bg-primary/5 p-3 rounded-md border border-primary/20">
            <div>
              <p className="font-semibold text-primary">{selectedMed.name}</p>
              <p className="text-sm text-muted-foreground">{[selectedMed.form, selectedMed.manufacturer, selectedMed.generic].filter(Boolean).join(' · ')}</p>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={() => { setSelectedMed(null); setNotice('') }} className="min-h-11">
              Change
            </Button>
          </div>

          {selectedMed.brandId && <Button type="button" variant="outline" disabled={favoriteBusy} aria-pressed={selectedMed.isFavorite || false}
            onClick={async () => {
              setFavoriteBusy(true)
              try { await setMedicineFavorite(selectedMed.brandId!, !selectedMed.isFavorite); setSelectedMed(current => current?.id === selectedMed.id ? { ...current, isFavorite: !selectedMed.isFavorite } : current) }
              catch { setError('Could not update favorite. Try again.') }
              finally { setFavoriteBusy(false) }
            }}>{selectedMed.isFavorite ? '★ Remove favorite' : '☆ Add favorite'}</Button>}
          <p className="text-sm text-muted-foreground">Review the form, strength and composition before adding. Usual entries are recalled from your own use.</p>
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

          <Button type="button" onClick={handleAdd} className="w-full h-12 gap-2" disabled={!dosage.trim() || !frequency.trim() || !duration.trim()}>
            <Plus className="w-4 h-4" /> Add to Prescription
          </Button>
        </div>
      )}
      <p className="text-xs text-muted-foreground">Catalog: NRCeS / C-DAC, Pune · <a className="underline" href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0</a>. Includes licensed SNOMED CT content. Source entries reformatted for search; availability and clinical suitability require doctor review.</p>
    </div>
  )
}
