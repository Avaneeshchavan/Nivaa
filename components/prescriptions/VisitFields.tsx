'use client'

import { Input } from '@/components/ui/input'
import type { VisitFormValues } from '@/lib/validations/visit.schema'

const fields = [
  { name: 'weightKg', label: 'Weight (kg)', step: '0.1' },
  { name: 'bloodPressure', label: 'BP (mmHg)', placeholder: '120/80' },
  { name: 'temperatureC', label: 'Temperature (°C)', step: '0.1' },
  { name: 'spo2', label: 'SpO₂ (%)', step: '1' },
] as const

export default function VisitFields({ value, onChange }: { value: VisitFormValues; onChange: (value: VisitFormValues) => void }) {
  return (
    <fieldset className="bg-white p-4 rounded-lg border space-y-3">
      <legend className="font-semibold px-1">Today&apos;s measurements (optional)</legend>
      <div className="grid grid-cols-2 gap-3">
        {fields.map(field => (
          <label key={field.name} className="text-sm font-medium">{field.label}
            <Input className="h-12 mt-1" type={field.name === 'bloodPressure' ? 'text' : 'number'}
              inputMode={field.name === 'bloodPressure' ? 'text' : 'decimal'}
              step={'step' in field ? field.step : undefined}
              placeholder={'placeholder' in field ? field.placeholder : undefined}
              value={value[field.name]} onChange={e => onChange({ ...value, [field.name]: e.target.value })} />
          </label>
        ))}
      </div>
    </fieldset>
  )
}
