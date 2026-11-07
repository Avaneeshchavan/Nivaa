'use client'

import { useId, useState } from 'react'
import { createCustomMedicine } from '@/actions/medicines.actions'
import { customMedicineSchema, medicineForms } from '@/lib/validations/custom-medicine.schema'
import type { Medicine } from '@/lib/generated/prisma/client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function CustomMedicineForm({ initialName, initialSystem, onCancel, onCreated }: {
  initialName: string
  initialSystem: 'ALLOPATHY' | 'AYURVEDIC'
  onCancel: () => void
  onCreated: (result: { medicine: Medicine; alreadyExists: boolean }) => void
}) {
  const id = useId()
  const [values, setValues] = useState({ name: initialName, form: 'tablet' as typeof medicineForms[number], strength: '', manufacturer: '', generic: '', system: initialSystem })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const save = async () => {
    if (busy) return
    const parsed = customMedicineSchema.safeParse(values)
    if (!parsed.success) { setError(parsed.error.issues[0].message); return }
    setError('')
    setBusy(true)
    try { onCreated(await createCustomMedicine(parsed.data)) }
    catch { setError('Could not save the medicine. Check the details and try again.') }
    finally { setBusy(false) }
  }

  // This picker is also inside the template editor's form: never nest a form.
  return <section aria-labelledby={`${id}-title`} className="space-y-4 rounded-xl border p-4" onKeyDown={event => {
    if (event.key === 'Enter' && !event.nativeEvent.isComposing && event.target instanceof HTMLInputElement) {
      event.preventDefault()
      void save()
    }
  }}>
    <h3 id={`${id}-title`} className="text-lg font-semibold">Add custom medicine</h3>
    <fieldset disabled={busy} className="space-y-4">
      <label htmlFor={`${id}-name`} className="block space-y-2 font-medium"><span>Name</span>
        <Input id={`${id}-name`} autoFocus value={values.name} maxLength={160} onChange={event => setValues({ ...values, name: event.target.value })} />
      </label>
      <label htmlFor={`${id}-form`} className="block space-y-2 font-medium"><span>Form</span>
        <select id={`${id}-form`} value={values.form} onChange={event => setValues({ ...values, form: event.target.value as typeof values.form })} className="min-h-12 w-full rounded-lg border border-input bg-card px-3 text-base">
          {medicineForms.map(form => <option key={form} value={form}>{form[0].toUpperCase() + form.slice(1)}</option>)}
        </select>
      </label>
      {([
        ['strength', 'Strength (optional)', 80],
        ['manufacturer', 'Company / manufacturer (optional)', 160],
        ['generic', 'Generic / composition (optional)', 240],
      ] as const).map(([field, label, maxLength]) => <label key={field} htmlFor={`${id}-${field}`} className="block space-y-2 font-medium"><span>{label}</span>
        <Input id={`${id}-${field}`} value={values[field]} maxLength={maxLength} onChange={event => setValues({ ...values, [field]: event.target.value })} />
      </label>)}
      <div role="group" aria-label="Medicine category" className="flex flex-wrap gap-2">
        {(['ALLOPATHY', 'AYURVEDIC'] as const).map(system => <Button key={system} type="button" variant={values.system === system ? 'default' : 'outline'} aria-pressed={values.system === system} onClick={() => setValues({ ...values, system })}>{system === 'AYURVEDIC' ? 'AYUSH' : 'Allopathy'}</Button>)}
      </div>
    </fieldset>
    {error && <p role="alert" className="text-sm text-red-900">{error}</p>}
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="outline" disabled={busy} onClick={onCancel}>Cancel</Button>
      <Button type="button" className="flex-1" disabled={busy} onClick={() => void save()}>{busy ? 'Saving medicine…' : 'Save medicine and set dosage'}</Button>
    </div>
  </section>
}
