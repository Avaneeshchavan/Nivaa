// Readiness checks only: never infer a composition, dosage or clinical equivalence.
export type CatalogRow = Record<string, string>
export const normalizeBrandSearch = (value: string) => value.normalize('NFKC').toLowerCase()
  .replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/gu, ' ')

// CSV/TSV parser with quoted delimiters, escaped quotes and multiline fields.
// Reject ragged records instead of silently shifting composition/company columns.
export function parseCatalog(text: string, delimiter: ',' | '\t'): CatalogRow[] {
  const records: string[][] = []
  let record: string[] = [], field = '', quoted = false, closed = false
  const finishField = () => { record.push(field); field = ''; closed = false }
  const finishRecord = () => { finishField(); if (record.some(value => value.trim())) records.push(record); record = [] }
  text = text.replace(/^\uFEFF/u, '')
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++ }
      else if (c === '"') { quoted = false; closed = true }
      else field += c
    } else if (c === delimiter) finishField()
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      finishRecord()
    } else if (c === '"' && !field && !closed) quoted = true
    else {
      if (closed || c === '"') throw new Error('Malformed quoted field')
      field += c
    }
  }
  if (quoted) throw new Error('Unclosed quoted field')
  if (field || record.length || closed) finishRecord()
  if (!records.length) throw new Error('Catalog is empty')
  const headers = records.shift()!.map(value => value.trim())
  if (headers.some(value => !value) || new Set(headers).size !== headers.length) throw new Error('Missing or duplicate headers')
  return records.map((values, index) => {
    if (values.length !== headers.length) throw new Error(`Column count mismatch at record ${index + 2}`)
    return Object.fromEntries(headers.map((key, column) => [key, values[column]]))
  })
}

export function readJsonCatalog(text: string): CatalogRow[] {
  const value: unknown = JSON.parse(text)
  if (!Array.isArray(value) || !value.every(row => row && typeof row === 'object' && !Array.isArray(row) && Object.values(row).every(item => item === null || ['string', 'number', 'boolean'].includes(typeof item)))) {
    throw new Error('Expected an array of flat catalog objects')
  }
  return value.map(row => Object.fromEntries(Object.entries(row).map(([key, item]) => [key, item == null ? '' : String(item)])))
}

export function inspectCatalog(rows: CatalogRow[]) {
  if (!rows.length) throw new Error('Catalog is empty')
  const columns = new Set(rows.flatMap(row => Object.keys(row)))
  const dataset = ['id', 'name', 'manufacturer_name', 'type', 'Is_discontinued', 'short_composition1'].every(key => columns.has(key))
  if (!dataset) return { format: 'UNMAPPED' as const, rows: rows.length, columns: [...columns], accepted: 0, discontinued: 0, duplicateCandidates: 0, reviewRows: [] as { row: number; reason: string }[] }
  const seen = new Set<string>(), reviewRows: { row: number; reason: string }[] = []
  let accepted = 0, discontinued = 0, duplicateCandidates = 0
  rows.forEach((row, index) => {
    const flag = row.Is_discontinued?.trim().toLowerCase()
    if (!['true', 'false', '1', '0', 'yes', 'no'].includes(flag)) {
      reviewRows.push({ row: index + 2, reason: 'Unknown discontinued flag' }); return
    }
    if (['true', '1', 'yes'].includes(flag)) { discontinued++; return }
    if (!row.id?.trim() || !row.name?.trim() || row.name.length > 240) {
      reviewRows.push({ row: index + 2, reason: 'Missing ID/name or name over 240 characters' }); return
    }
    if (!row.manufacturer_name?.trim() || !row.short_composition1?.trim() || !row.type?.trim()) {
      reviewRows.push({ row: index + 2, reason: 'Company, composition or form requires review' }); return
    }
    // A candidate for human review, not permission to merge two clinical products.
    // Preserve decimal strengths and exact composition text in the identity.
    const key = JSON.stringify([row.name, row.manufacturer_name, row.type, row.short_composition1, row.short_composition2 || ''].map(value => value.normalize('NFKC').trim().replace(/\s+/gu, ' ').toLowerCase()))
    if (seen.has(key)) { duplicateCandidates++; return }
    seen.add(key)
    accepted++
  })
  return { format: 'DATASET' as const, rows: rows.length, columns: [...columns], accepted, discontinued, duplicateCandidates, reviewRows }
}
