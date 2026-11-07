# N1 implementation and review handoff

Branch: v2/brand-catalog. Source: user-supplied NRCeS Flat Files ZIP. The owner
confirmed an applicable Affiliate License before import. N2 has not been started.

## Implemented

| N1 requirement | Implementation and evidence |
| --- | --- |
| Relational catalog | Brand, Composition, BrandComposition, BrandAlias and DoctorMedicinePref with source/system/form/food enums. Additive migration 202611070006_brand_catalog creates only new catalog/preference objects, backfills the 267 legacy presentations and leaves patient records/past Rx JSON untouched. Fresh seed runs also bridge Medicine into Brand. |
| Import | scripts/import-brands.ts loads the actual linked NRCeS TSV masters or the specified CSV/JSON pharmacy-dataset layout. Stable identities, transaction batches of 400, explicit duplicate/reject reporting, source aliases, source-derived composition links and restart skipping of committed IDs. No price or clinical advice imported. Numeric IDs remain strings; unsafe large numeric JSON identifiers are rejected. |
| Source data | 93,911 original brand rows; 14 malformed/unjoinable rows quarantined; 93,897 imported. First run inserted 93,897; subsequent run inserted zero. The 202 allopathic and 65 Ayurvedic legacy presentations remain, for 94,164 searchable presentations. No raw catalog files or local secrets are pushed. |
| Ranked search | Parameter-bound SQL, exact/prefix/token matches, doctor favorites/use/recency, trigram fallback and company/composition matches. At most 20 results. Aliases are populated from source product names. Empty-query focus loads that doctor's favorites/recents. The token, trigram and prefix indexes are tracked. Numeric terms, release modifiers (MD/LC/SR/XR/DSR/Forte/Plus) and explicit dosage forms refine results. A tablet query cannot fall through to the injection-only Uprise record. |
| Picker | 100ms debounce, abort/stale-response protection, 44px rows, system badges and optional filters, company/composition/form display, favorites toggle and corrected N0 custom-entry flow. New custom records are DOCTOR_ADDED, carry the creating doctor and become that doctor's favorites. Patient changes remount the pending medicine form. |
| Learning | Adding an Rx medicine updates only the active doctor's use count, recency and entered dose/frequency/duration/instruction. No guessed first-use BD/5-day regimen; first-use fields are blank. Defaults for structured pattern/food/duration-days are modeled for N2. Template editing does not inflate Rx use counts. Preference failure does not remove the medicine from the form. |
| Rx compatibility | Optional brandId plus printed name/strength/form/manufacturer/composition snapshots. Existing JSON parses without new fields and stays unchanged. Free-text medicine renames clear the old linked ID/composition/company/strength/form; dose-only edits preserve snapshots. PDF generation continues from snapshots, never a lookup of a changed current catalog entry. |
| Source notices | Source attribution, change notice, CC link and original license notice link in the picker. Supplied raw package/license remain locally ignored; the text-only license notice is tracked for display. |

## Verification

- TypeScript and production build passed, including lint/type checks without warnings.
- 21 regression scripts passed, covering source parsing, 200-row ranking fixtures,
  all 13 requested queries, representative typos, custom/legacy duplicates,
  concurrent creation, metadata rollback, active-doctor preference ownership,
  discontinued exclusion, snapshot compatibility, stale requests, existing patient/
  draft/notes/PDF protections and new-table browser-role denial.
- A separate scale benchmark runs the exact search SQL against 250,007 synthetic
  local records. Final p95 is recorded in SEARCH_PERF.md (about 10ms on this run).
  Synthetic probe brands never enter the clinic database.
- Real-source verification exercised all 13 queries, cap 20, preserved legacy
  counts and five new private tables. Client-to-DB timings and EXPLAIN/BUFFERS,
  including the token-index plan, are in SEARCH_PERF.md. They exclude Auth/HTTP/
  device rendering; no full signed-in HTTP latency target is claimed.
- Fourteen tracked migrations are applied. Import growth was about 216MB; final
  database size is about 230MB (219MiB), below the importer's 450MiB default guard.
  This is not a verification of hosting-plan entitlement or future headroom.
- The actual hosted Prisma adapter/query and response mapping were exercised successfully.
- The real coverage CLI smoke produced HIT for Ondem MD and Aciloc 300, and MISS for the missing Uprise D3 Tablet. This three-row probe is not the parents' top-100 test.
- Original auth, middleware, Supabase helpers and existing security migrations
  remain unchanged. New tables extend the established server-only denial pattern.
- No dependency or .env changes. No patient rows were read for catalog verification.

During development, the first scale check exposed a multi-second fuzzy-query
case. Numeric/token indexing, bounded candidates and fallback behavior corrected
it. A script environment-loader interop problem stopped initial imports before
any brand writes; named imports corrected it. These are resolved, not concealed
as successful early runs. See the final reproducible scripts and reports.

## Review before N2

1. Search real brands with the parents: Ondem MD, Aciloc 300, Dolo 650, Montair LC;
   also try a company such as Alkem and a composition such as ondansetron.
2. Confirm the exact form/strength/company against their formulary. The source has
   different oral/orodispersible Ondem MD records. Uprise D3 is injection-only in
   this release. No oral product or clinical approval was invented.
3. Favorite a medicine and confirm the usual entries reappear after adding it to
   an Rx. These are remembered doctor inputs, not dosing recommendations.
4. Supply parents_top100.csv and run coverage-check.ts. That actual-list acceptance
   has not occurred; the supplied V2 probes are not a substitute for their list.

NRCeS has no medical-system or discontinued field. Its records are labeled
Unclassified (OTHER) and included in default All medicines; the original
allopathic/Ayurvedic entries retain their classifications. UNKNOWN source
marketing-license status is not treated as a discontinued/approved flag. Fields
were preserved and derived for search, not clinically validated. Fuzzy lookup is
a fallback when no direct candidates are found; it is not a guarantee that
every spelling or equivalent presentation resolves correctly. Source snapshots
preserve full text; composition splitting recognizes explicit top-level source
separators and does not establish clinical equivalence.

The browser integration still fails with browser.user unavailable. No rendered
Safari/iPad, real keyboard/touch, signed-in favorite/dose flow or physical print
acceptance was performed. Component/SQL/action tests are narrower evidence.
Backup/restore, least-privilege runtime role and the earlier operational gaps
remain open; this task does not complete N7 or the original backup drill.

## Operations and release

Commands are in DB_NOTES.md and data/brands/README.md. Imports enforce a size
budget, commit atomic batches and preserve existing data. A changed future source
release needs a reviewed update plan; resume/idempotence was tested on this exact
package. Do not reset/drop the database or modify an applied migration.

Production release details and HTTP smoke results are added after deployment.
