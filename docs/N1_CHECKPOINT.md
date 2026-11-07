# N1 review checkpoint: source selection and import readiness

Branch: v2/brand-catalog, based on completed N0 at d614a4c.

N1 is **in progress, not complete**. N2 has not been started. The user requested
prompt-by-prompt tracking and a pause when review is useful. This is the first N1
review checkpoint: the chosen dataset/package and its reuse terms need review.
The V2 prompt explicitly assigns source selection/download to the owner.

## Completed in this checkpoint

- Read AGENTS.md, TASKS.md, V2_AUDIT.md, model, medicine route, seed and N1/N2 prompts.
- Installed Next docs path remains absent; official Next 15 route documentation
  was consulted before implementation.
- Checked official NRCeS documentation: the flat-file package is linked TSV
  masters, with terms supplied inside License.txt. The exact release headers and
  license have not been provided; do not invent a flattened CDCI column mapping.
- Added an environment-free local preflight command for CSV, TSV/TXT and JSON.
  Handles BOM, quoting, escaped delimiters and multiline values. Rejects ragged
  records, duplicate headers, malformed quoting, nested JSON and outside-folder
  paths. File limit 128 MiB; raw data stays ignored in Git.
- Added structural readiness counts for the pharmacy-dataset layout specified in
  N1: skip discontinued items, flag missing company/composition/form, identify
  exact duplicate candidates, retain decimal-strength distinctions. No clinical
  equivalence or dose is inferred. Unknown layouts are explicitly UNMAPPED.
- Added owner download instructions and a report which distinguishes readiness
  from production import. No catalog/package was downloaded or scraped.

## Remaining N1 scope

Brand/Composition/Alias/DoctorMedicinePref models and additive migration; legacy
catalog migration; resumable relational import with license provenance; actual
brand/composition/company search and ranked trigram indexes; empty-query
favorites/recents; usage/default learning; snapshot compatibility; picker
integration; 200-row search-ranking tests; top-100 coverage command; EXPLAIN and
realistic size/latency measurements. These are not represented as completed by the
preflight tests. N2 depends on these interfaces and remains pending.

## Review needed

Choose NRCeS Flat Files, a verified licensed dataset, or a doctor-owned formulary.
For NRCeS, provide the local extracted package including License.txt. For another
dataset, identify the exact source/release and license. Also gather the parents'
actual top-100 brands. See MED_DATA_SOURCES.md for click-by-click download steps.

No runtime code, schema, authentication/security policy, environment file or live
database was changed in this checkpoint. It does not change the deployed N0 app.
No new dependency was added. This branch is a reviewable preparation checkpoint;
it is not a production rollout of N1.

## Verification

- node scripts/check-brand-preflight.cjs: passed (200 synthetic records, formats,
  malformed inputs, quoted fields, discontinued flags and decimal distinctions).
- npx tsc --noEmit: passed.
- npm run build: passed, including lint/type validation.
- Actual CLI integration: passed with 200 synthetic rows; report omits raw values, outside-folder and malformed input are rejected, previous report is preserved on failure. Test fixtures were removed.
