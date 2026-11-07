# N1 checkpoint: real NRCeS package inspected

Branch: v2/brand-catalog. N1 is in progress, not complete. N2 is unstarted.

The owner supplied CommonDrugCodesForIndia_FlatFilePackage.zip in Downloads.
The archive was safely extracted into ignored data/brands/nrces/ with original
License.txt/README retained. Raw files are not pushed to GitHub.

## Completed

- Source/header inspection of all seven master files and the actual license.
- Dedicated plain-TSV loader supporting the package's terminal-tab convention,
  literal quotation marks, string identifiers, required headers and duplicate-ID
  rejection. General CSV parsing is deliberately not used to reinterpret NRCeS.
- Exact Brand -> Product/Supplier/Generic -> DrugForm joins. Source company,
  composition text, form and update date are preserved. No dosing invented.
- 93,911 source brand rows: 2 malformed rows quarantined; 12 otherwise valid
  brands with missing generic links quarantined; 93,897 joined brands remain.
- Generated docs/IMPORT_REPORT.md with inventory, row-level quarantine reasons
  and source query presence. Ondem/MD, Aciloc 300 and Dolo 650 exist. Uprise D3 has
  only an injection presentation in this package. No oral product was inferred.
- Tests cover 200 synthetic joined brands, broken references, malformed rows,
  duplicate IDs, lossless long identifiers and preserved source status.
- Inspected package has UNKNOWN marketing-license status on every brand and no
  discontinued field. These values are not treated as proof of current approval
  or as a discontinued flag.

## Owner checkpoint before deployment

The package's license identifies CC BY 4.0 plus SNOMED-related and India-use
conditions. NRCeS's official FAQ says SNOMED use requires an Affiliate License
even when free within India. Confirm existing developer/clinic license and
sublicense coverage or complete the registration/agreements yourself. Specific
sources and instructions are in docs/MED_DATA_SOURCES.md. No agreement has been
accepted on the owner's behalf. This review needs resolution before publishing
the imported terminology through the app.

## Remaining N1 scope

Brand/Composition/Alias/DoctorMedicinePref models and additive private migration;
legacy preservation; resumable importer; ranked trigram database search; company/
composition search integration; favorites/usage/defaults; Rx snapshots and picker;
source attribution in deployed UI; top-100 coverage; EXPLAIN and scale tests.
The offline query inventory is not ranked-search or latency acceptance evidence.
No live database/schema/runtime change or N1 deployment has occurred. N0 remains
live. No dependency or .env changes were made.

## Verification

- node scripts/check-nrces-package.cjs: passed, including 200 joined fixture rows.
- node scripts/check-brand-preflight.cjs: passed, including CLI integration.
- node --import tsx scripts/inspect-nrces.ts: passed on the supplied real package.
- npx tsc --noEmit: passed.
- npm run build: passed, including lint/type checks.
- Raw package ignored; git diff --check passed.
