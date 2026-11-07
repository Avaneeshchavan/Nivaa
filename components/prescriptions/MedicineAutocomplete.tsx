'use client'

import { startRxSearch, addedRxMedicine } from '@/lib/rx/metrics'
import { useEffect, useRef, useState } from 'react'
import { useDebouncedCallback } from 'use-debounce'
import { cachedMedicines, cacheMedicines, clearMedicineCache } from '@/lib/medicines/session-cache'
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
import DoseFields, { blankDose, type DoseValues } from './DoseFields'
import { defaultDoseUnit, doseUnits, parseDosePattern, quantityForPattern } from '@/lib/rx/dose'
import CustomMedicineForm from './CustomMedicineForm'
import type { BrandChoice } from '@/lib/medicines/brand'
import { rememberMedicineUse, setMedicineFavorite } from '@/actions/brand-preferences.actions'

export default function MedicineAutocomplete({ onAdd, doctorId, recentInstructions = [] }: { onAdd?: (medicine: RxMedicine) => void; doctorId?: string; recentInstructions?: string[] } = {}) {
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
      const cached=cachedMedicines(doctorId,query,category)
      if(cached && version===searchVersion.current){setMedicines(cached);return}
      const res = await fetch(`/api/medicines?q=${encodeURIComponent(query)}&system=${category}`, { signal: controller.signal, cache: 'no-store', redirect: 'error' })
      const data = await res.json()
      if (!res.ok || !Array.isArray(data)) throw new Error('Medicine search failed. Try again.')
      if (version === searchVersion.current) { cacheMedicines(doctorId,query,category,data); setMedicines(data) }
    } catch {
      if (!controller.signal.aborted && version === searchVersion.current) setError('Medicine search unavailable. Try again.')
    } finally {
      if (version === searchVersion.current) setLoading(false)
    }
  }, 100)
  useEffect(() => () => { requestRef.current?.abort(); fetchMedicines.cancel() }, [fetchMedicines])

  const handleSearch = (value: string) => {
    if (value.trim()) startRxSearch()
    requestRef.current?.abort()
    setSearch(value)
    setError(null)
    setNotice('')
    setMedicines([])
    setLoading(Boolean(value.trim()))
    fetchMedicines(value.trim(), ++searchVersion.current, system)
  }

  // Inline form state
  const [dose, setDose] = useState<DoseValues>(blankDose)
  const {dosage,frequency,duration,instructions} = dose
  const chooseMedicine = (medicine: BrandChoice) => {
    setSelectedMed(medicine)
    const next: DoseValues = { ...blankDose, doseUnit:medicine.defaults?.defaultDoseUnit || defaultDoseUnit(medicine.form),
      dosage:medicine.defaults?.defaultDosage||'', frequency:medicine.defaults?.defaultFrequency||'',
      duration:medicine.defaults?.defaultDuration||'', instructions:medicine.defaults?.defaultInstruction||'',
      pattern:medicine.defaults?.defaultPattern||'',food:medicine.defaults?.defaultFood||undefined,
      durationDays:medicine.defaults?.defaultDurationDays||null,
    }
    next.quantity = next.doseUnit !== 'other' ? quantityForPattern(next.pattern || '', next.durationDays, next.frequency) : null
    setDose(next)
  }

  const handleAdd = () => {
    if (!selectedMed || !dosage.trim() || !frequency.trim() || !duration.trim() || (dose.pattern && !parseDosePattern(dose.pattern))) return

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
      ...dose,
      quantity: dose.doseUnit && dose.doseUnit !== 'other' ? quantityForPattern(dose.pattern || '', dose.durationDays, dose.frequency) : null,
    })

    if (!onAdd) addedRxMedicine()
    if (!onAdd && selectedMed.brandId) void rememberMedicineUse({ brandId: selectedMed.brandId, dosage, frequency, duration, instructions, pattern:dose.pattern,food:dose.food,durationDays:dose.durationDays??null,doseUnit:dose.doseUnit as typeof doseUnits[number] })
      .then(() => clearMedicineCache(doctorId))
      .catch(() => setNotice('Medicine added. Usual entries could not be remembered; try again next time.'))

    // Reset form
    setSelectedMed(null)
    setNotice('')
    setSearch('')
    searchVersion.current += 1
    setMedicines([])
    setDose(blankDose)
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
          clearMedicineCache(doctorId)
          setCustomName(null)
          setNotice(alreadyExists ? `Already exists: ${medicine.name}` : `Added: ${medicine.name}`)
          chooseMedicine(medicine)
        }} /> : !selectedMed ? (
        <Command shouldFilter={false} className="rounded-xl border border-input bg-card">
          <CommandInput
            maxLength={100}
            aria-label="Search for a medicine"
            placeholder="Search brand, generic or company"
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
              try { clearMedicineCache(doctorId); await setMedicineFavorite(selectedMed.brandId!, !selectedMed.isFavorite); setSelectedMed(current => current?.id === selectedMed.id ? { ...current, isFavorite: !selectedMed.isFavorite } : current) }
              catch { setError('Could not update favorite. Try again.') }
              finally { setFavoriteBusy(false) }
            }}>{selectedMed.isFavorite ? '★ Remove favorite' : '☆ Add favorite'}</Button>}
          <p className="text-sm text-muted-foreground">Review the form, strength and composition before adding. Usual entries are recalled from your own use.</p>
          <DoseFields value={dose} onChange={setDose} recentInstructions={recentInstructions}/>

          <Button type="button" onClick={handleAdd} className="w-full h-12 gap-2" disabled={!dosage.trim() || !frequency.trim() || !duration.trim() || Boolean(dose.pattern && !parseDosePattern(dose.pattern))}>
            <Plus className="w-4 h-4" /> Add to Prescription
          </Button>
        </div>
      )}
      <p className="text-xs text-muted-foreground">Catalog: NRCeS / C-DAC, Pune · <a className="underline" href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0</a>. Includes licensed SNOMED CT content. Source entries reformatted for search; availability and clinical suitability require doctor review. <a href="/catalog-notices/nrces-license.txt" target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center underline">Source license notices</a></p>
    </div>
  )
}
