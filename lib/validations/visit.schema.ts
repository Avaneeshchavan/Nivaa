import { z } from 'zod'

const weight = z.number().finite().positive().max(1000)
const temperature = z.number().finite().positive().max(100)
const oxygen = z.number().int().min(0).max(100)
const pressure = z.string().trim().transform(value => value.replace(/\s/g, ''))
  .pipe(z.string().regex(/^(?:\d{1,3}\/\d{1,3})?$/, 'Use systolic/diastolic, for example 120/80'))
  .transform(value => value || null)

export const visitSchema = z.object({
  weightKg: weight.nullish(),
  bloodPressure: pressure.nullish(),
  temperatureC: temperature.nullish(),
  spo2: oxygen.nullish(),
})

const numericInput = (schema: z.ZodNumber) => z.string().trim()
  .transform(value => value === '' ? null : Number(value)).pipe(schema.nullable())
export const visitFormSchema = z.object({
  weightKg: numericInput(weight),
  bloodPressure: pressure,
  temperatureC: numericInput(temperature),
  spo2: numericInput(oxygen),
})
export type VisitFormValues = z.input<typeof visitFormSchema>
export type VisitMeasurements = z.output<typeof visitSchema>
export const emptyVisitForm: VisitFormValues = { weightKg: '', bloodPressure: '', temperatureC: '', spo2: '' }

export function formatVisitMeasurements(visit?: VisitMeasurements | null) {
  if (!visit) return ''
  return [
    visit.weightKg != null ? `Weight: ${visit.weightKg} kg` : '',
    visit.bloodPressure ? `BP: ${visit.bloodPressure} mmHg` : '',
    visit.temperatureC != null ? `Temp: ${visit.temperatureC} C` : '',
    visit.spo2 != null ? `SpO2: ${visit.spo2}%` : '',
  ].filter(Boolean).join(' · ')
}
