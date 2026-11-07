# Local medicine catalog inputs

Raw files in this directory are ignored by Git. Only this README and .gitignore
are tracked. Never place patient exports, prescriptions or credentials here.

Read docs/MED_DATA_SOURCES.md before choosing a source. Keep the original package,
license and release notes locally. The doctor supplies parents_top100.csv with a
`name` header for the later coverage check. Do not fill it with guessed brands.

Local inspection (no database connection, import, scraping or environment load):

```sh
node --import tsx scripts/preflight-brands.ts data/brands/catalog.csv
node --import tsx scripts/preflight-brands.ts data/brands/nrces/BrandMaster.txt
```

Use the actual file name. CSV uses commas; .tsv/.txt uses tabs; JSON must be an
array of flat records. Files must resolve inside this folder, including symlinks,
and be at most 128 MiB. The report is docs/IMPORT_REPORT.md and omits raw contents.
The named pharmacy-dataset layout is recognized for structural readiness only.
Unknown layouts are explicitly UNMAPPED; joined NRCeS import is not implemented.
The tool skips discontinued rows in its counts, flags incomplete rows and marks
exact presentation duplicate candidates without clinical merging. It ignores
price. This is a review checkpoint within N1, not a completed N1 importer.
