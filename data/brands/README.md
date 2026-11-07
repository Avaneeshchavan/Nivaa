# Local medicine catalog inputs

Raw packages, exports and parents_top100.csv stay ignored by Git. Only this README
and .gitignore are tracked. Keep the original license/release files with the data.
Do not place patient exports or credentials here.

The owner supplied NRCeS Flat Files under nrces/ and confirmed an applicable
Affiliate License. The production source import is recorded in IMPORT_REPORT.md.

```sh
# Local inspection: no database writes.
node --import tsx scripts/inspect-nrces.ts data/brands/nrces
node --import tsx scripts/import-brands.ts --dry-run
# After migration and confirmed rights: resumable transactional import.
node --import tsx scripts/import-brands.ts --license-confirmed
# Alternative supported dataset layout; operator must verify that source's license.
node --import tsx scripts/import-brands.ts data/brands/catalog.csv --dataset --dry-run
```

The pharmacy-dataset layout uses id, name, manufacturer_name, type,
Is_discontinued, short_composition1, optional short_composition2/pack_size_label.
Type can denote medical system; dosage form is read from an explicit form field
or a recognized name suffix. Unknown units, systems and statuses are not guessed.
Price is discarded. NRCeS has its own exact linked-TSV loader.

Put the doctors' actual frequent brands in parents_top100.csv with a `name` header,
one medicine name per row, including the strength/form they mean where possible.
No patient details or dosing guidance are needed. Then run:

```sh
node --import tsx scripts/coverage-check.ts data/brands/parents_top100.csv
```

An optional final doctor-id selects that doctor's preference ranking; default is
the first active doctor. HIT means a lexical match in the top three, not verified
clinical equivalence. Inspect the actual returned strength/form/company.
