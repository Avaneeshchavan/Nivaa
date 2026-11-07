export const foodLabels = { BEFORE: 'Before food', AFTER: 'After food', WITH: 'With food', EMPTY: 'Empty stomach', ANY: '' } as const
export type Food = keyof typeof foodLabels
export const doseUnits = ['tablet', 'capsule', 'mL', 'drops', 'units', 'sachet', 'g', 'other'] as const
export function parseDosePattern(value: string): [number, number, number] | null {
  const parts = value.trim().split('-')
  if (parts.length !== 3) return null
  const amounts = parts.map(part => {
    const text = part.trim()
    if (!/^(?:\d+(?:\.\d+)?|\d+\/\d+)$/u.test(text)) return NaN
    const fraction = text.split('/').map(Number)
    return fraction.length === 2 ? fraction[1] ? fraction[0] / fraction[1] : NaN : fraction[0]
  })
  return amounts.every(n => Number.isFinite(n) && n >= 0 && n <= 1000) && amounts.some(n => n > 0) ? amounts as [number, number, number] : null
}
export function quantityForPattern(pattern: string, days?: number | null, frequency?: string) {
  if (!days || !Number.isInteger(days) || days < 1 || days > 3650 || ['SOS','QID'].includes(frequency || '')) return null
  const slots = parseDosePattern(pattern)
  return slots ? Math.round(slots.reduce((sum,n) => sum+n,0)*days*1e6)/1e6 : null
}
export function frequencyForPattern(pattern: string) {
  const slots = parseDosePattern(pattern)
  if (!slots) return ''
  const count = slots.filter(n => n > 0).length
  return count === 3 ? 'TDS' : count === 2 ? 'BD' : slots[2] > 0 ? 'HS' : 'OD'
}
export function defaultDoseUnit(form?: string | null): typeof doseUnits[number] {
  const value = form?.toLowerCase() || ''
  if (/injection|inhaler/u.test(value)) return 'units'
  if (/tablet/u.test(value)) return 'tablet'
  if (/capsule/u.test(value)) return 'capsule'
  if (/drop/u.test(value)) return 'drops'
  if (/syrup|suspension|solution|liquid/u.test(value)) return 'mL'
  if (/sachet/u.test(value)) return 'sachet'
  return 'other'
}
export function medicineInstructions(medicine: { food?: Food; instructions?: string | null }) {
  return [medicine.food ? foodLabels[medicine.food] : '', medicine.instructions].filter(Boolean).join(' · ')
}
export function clinicToday(now = new Date()) {
  return now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
}
export function followUpAfter(days: number, start = clinicToday()) {
  const date = new Date(`${start}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate()+days)
  return date.toISOString().slice(0,10)
}
