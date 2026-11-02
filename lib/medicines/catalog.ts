import { createHash } from 'node:crypto'

// Medicine is a shared catalog, not a patient or doctor-owned record.
export function medicineCatalogId(name: string, form?: string | null) {
  const normalize = (value: string) => value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase()
  return `catalog_${createHash('sha256').update(JSON.stringify([normalize(name), normalize(form || '')])).digest('hex')}`
}
