import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

type Row = Record<string, string>
export type CatalogIssue = { file: string; record: number; reason: string }
export type NrcesBrand = {
  sourceId: string; name: string; productName: string; manufacturer: string
  compositionText: string; genericSourceId: string; formText: string
  sourceUpdatedOn: string; marketingLicenseStatus: string
}

// NRCeS uses plain TSV with an extra terminal tab on most records. Do not
// reinterpret embedded quotation marks as CSV or silently shift broken columns.
export function parseNrcesTable(text: string, file: string, required: string[]) {
  const lines = text.replace(/^\uFEFF/u, '').split(/\r?\n/u)
  const headers = lines.shift()!.split('\t').map(value => value.trim())
  if (new Set(headers).size !== headers.length || required.some(key => !headers.includes(key))) throw new Error(`Unexpected ${file} headers`)
  const rows: { row: Row; record: number }[] = [], issues: CatalogIssue[] = []
  lines.forEach((line, index) => {
    if (!line.trim()) return
    const cells = line.split('\t')
    if (cells.length === headers.length + 1 && cells.at(-1) === '') cells.pop()
    if (cells.length !== headers.length) { issues.push({ file, record: index + 2, reason: 'Column count mismatch' }); return }
    rows.push({ row: Object.fromEntries(headers.map((key, column) => [key, cells[column].trim()])), record: index + 2 })
  })
  return { rows, issues }
}

export async function readNrcesPackage(directory: string) {
  const specs = [
    ['BrandMaster.txt', ['Identifier', 'Brand Name', 'Product Identifier', 'Supplier Identifier', 'Generic Identifier', 'License Status', 'last_updated_on']],
    ['GenericMaster.txt', ['Identifier', 'Generic Name', 'Dose Form']],
    ['ProductMaster.txt', ['Identifier', 'Product Name']],
    ['SupplierMaster.txt', ['Identifier', 'Supplier Name']],
    ['DrugFormMaster.txt', ['Id', 'Dose Form']],
  ] as const
  const tables = await Promise.all(specs.map(async ([file, required]) => parseNrcesTable(await readFile(join(directory, file), 'utf8'), file, [...required])))
  const issues = tables.flatMap(table => table.issues)
  const maps = tables.map((table, index) => {
    const result = new Map<string, Row>()
    const key = index === 4 ? 'Id' : 'Identifier'
    for (const { row, record } of table.rows) {
      if (!/^\d+$/u.test(row[key]) || result.has(row[key])) throw new Error(`Invalid or duplicate identifier in ${specs[index][0]} at record ${record}`)
      result.set(row[key], row)
    }
    return result
  })
  const [, generics, products, suppliers, forms] = maps
  const brands: NrcesBrand[] = []
  for (const { row, record } of tables[0].rows) {
    const generic = generics.get(row['Generic Identifier'])
    const product = products.get(row['Product Identifier'])
    const supplier = suppliers.get(row['Supplier Identifier'])
    const form = generic && forms.get(generic['Dose Form'])
    if (!generic || !product || !supplier || !form) {
      issues.push({ file: 'BrandMaster.txt', record, reason: `Missing linked ${!generic ? 'generic' : !product ? 'product' : !supplier ? 'supplier' : 'form'}` }); continue
    }
    if (!row['Brand Name'] || !generic['Generic Name'] || !product['Product Name'] || !supplier['Supplier Name'] || !form['Dose Form']) {
      issues.push({ file: 'BrandMaster.txt', record, reason: 'Empty linked display field' }); continue
    }
    brands.push({
      sourceId: row.Identifier, name: row['Brand Name'], productName: product['Product Name'],
      manufacturer: supplier['Supplier Name'], genericSourceId: row['Generic Identifier'],
      compositionText: generic['Generic Name'], formText: form['Dose Form'],
      sourceUpdatedOn: row.last_updated_on, marketingLicenseStatus: row['License Status'],
    })
  }
  return { brands, issues, counts: Object.fromEntries(specs.map(([file], index) => [file, tables[index].rows.length])) }
}
