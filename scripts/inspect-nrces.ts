import { createHash } from 'node:crypto'
import { readFile, writeFile, realpath } from 'node:fs/promises'
import { relative, isAbsolute } from 'node:path'
import { readNrcesPackage } from '../lib/medicines/nrces-package'
import { normalizeBrandSearch } from '../lib/medicines/brand-preflight'

async function main() {
  const root = await realpath('data/brands')
  const directory = await realpath(process.argv[2] || 'data/brands/nrces')
  const child = relative(root, directory)
  if (child.startsWith('..') || isAbsolute(child)) throw new Error('Package must be under data/brands')
  const license = await readFile(`${directory}/License.txt`, 'utf8')
  const result = await readNrcesPackage(directory)
  const terms = ['ondem', 'ondem md', 'ondem 4', 'uprise', 'uprise d3', 'aciloc', 'aciloc 300', 'pan 40', 'dolo 650', 'azithral', 'montair lc', 'ondansetron', 'alkem']
  const probes = terms.map(query => {
    const tokens = normalizeBrandSearch(query).split(' ')
    const matches = result.brands.filter(brand => {
      const words = normalizeBrandSearch(`${brand.name} ${brand.manufacturer} ${brand.compositionText}`).split(' ')
      return tokens.every(token => words.includes(token))
    })
    return `| ${query} | ${matches.length} |`
  })
  const report = [
    '# N1 NRCeS package inspection', '',
    'Offline package inspection only. No database import, migration or production search change occurred.', '',
    'Source: CommonDrugCodesForIndia_FlatFilePackage.zip, supplied by the owner.',
    'Attribution: NRCeS / Centre for Development of Advanced Computing (C-DAC), Pune.',
    `License.txt SHA-256: ${createHash('sha256').update(license).digest('hex')}.`,
    'The supplied license identifies CC BY 4.0 and additional SNOMED/India conditions. See MED_DATA_SOURCES.md. No legal compliance certification is implied.', '',
    '## Source inventory', '', ...Object.entries(result.counts).map(([file, count]) => `- ${file}: ${count} structurally valid rows.`),
    `- Joined brand records available for later mapping: ${result.brands.length}.`,
    `- Quarantined malformed or unjoinable records across tables: ${result.issues.length}.`,
    '- Production records imported / duplicate records merged / database bytes added: 0 / 0 / 0.', '',
    '## Query inventory', '', 'Whole-token presence across source brand/company/composition text. These are inventory counts, not ranked-search or typo-tolerance acceptance tests.', '',
    '| Query | Matching source records |', '| --- | --- |', ...probes, '',
    'Important: the Uprise D3 entry in this package is a solution for injection. No oral formulation can be inferred from that record. Doctors must review the actual presentation they intend to use.', '',
    '## Quarantine', '', '| File | Record | Reason |', '| --- | --- | --- |',
    ...result.issues.map(issue => `| ${issue.file} | ${issue.record} | ${issue.reason} |`), '',
    'License Status is the manufacturer/marketing-license field. All supplied brand records say UNKNOWN. It is not a discontinued flag or proof that a medicine is approved/current. Missing discontinued status is retained as unknown; no active or discontinued status is invented.', '',
    'Generic Name is preserved verbatim as compositionText. This checker does not fabricate per-ingredient strengths, calculate doses, import clinical indications, or turn source text into clinical advice.', '',
    'Remaining N1 work: relational model/migration, resumable importer, aliases/ranked database search, per-doctor learning, snapshot/UI integration, coverage and scale verification. N2 remains unstarted.', '',
  ].join('\n')
  await writeFile('docs/IMPORT_REPORT.md', report)
  console.log(`Inspected ${result.brands.length} joined brands; ${result.issues.length} issues quarantined. No database writes. See docs/IMPORT_REPORT.md.`)
}
main().catch(() => { console.error('NRCeS inspection failed. Check package files, headers, identifiers and local path. No import occurred.'); process.exitCode = 1 })
