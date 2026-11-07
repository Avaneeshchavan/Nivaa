# N2 prescription builder — implementation and review handoff

Scope: N2 only from NIVAA_V2_PROMPTS.md, on `v2/rx-builder`, based on completed N1. N3–N7 are not implemented. Feature code is complete; rendered/device/performance acceptance is explicitly pending. This is not a claim that the complete four-medicine workflow has been demonstrated in under 60 seconds.

## What changed

| Area / files | Result |
|---|---|
| components/prescriptions/DoseFields.tsx; lib/rx/dose.ts | Morning/afternoon/night grid, halves/custom quantities, OD/BD/TDS/QID/HS/SOS, food chips, 3/5/7/10/14/30-day and Continue choices, recent instruction suggestions. Structured dose plus unit/duration math; no strength-to-dose conversion. QID/SOS/free text/Continue/unknown unit do not generate a guessed total. Liquids use explicit mL/drops/units per dose. Month is explicitly 30 days. |
| MedicineAutocomplete.tsx; lib/medicines/{session-cache,brand,usage}.ts; actions/brand-preferences.actions.ts | N1 catalog and doctor defaults retained, structured inputs learned when a brand is added. Defaults include pattern, food, unit and duration. Per-doctor memory cache, 30-second TTL, max 60 queries. Cache clears on learned preference, favorite and custom creation. Existing snapshots remain independent of later catalog changes. |
| app/(dashboard)/patients/[id]/page.tsx; app/(dashboard)/prescriptions/new/page.tsx; actions/prescriptions.actions.ts | Repeat last Rx from patient page and builder. Latest Rx is selected by createdAt then id, scoped to active doctor and patient ownership. Copy medicines/diagnosis/advice for today; clear visit, handwriting and old follow-up. Explicit copy confirmation required. Duplicate/repeat drafts are keyed to source Rx so a newer source cannot silently reuse a previous repeat draft. Copy never edits the original. |
| stores/rxBuilderStore.ts; RxSections.tsx; Toast.tsx | Memoized sections/individual medicine rows, touch drag handle plus arrow-key and move-up/down controls, 20-action undo/redo, removed-item Undo toast. Consecutive typing within 700 ms coalesces. Patient/owner hydration clears history. Renaming a medicine clears catalog identity. Form controls disable during a save so edits cannot race draft deletion. |
| DiseaseTemplateSelector.tsx; actions/rx-workflow.actions.ts | Search, recent and favorite rows; top eight templates with More. Existing entered medicines/diagnosis require confirmation before template replacement, and Undo is available. Diagnosis autocomplete combines the doctor's recent history with a small editable list of complaint/diagnosis labels, never automatic diagnosis. |
| AdviceLibrary.tsx; lib/rx/advice-seed.ts; docs/ADVICE_REVIEW.md | 20 reviewable starter snippets in each EN/MR/HI language, separately owned/editable/deletable for each doctor. Tap to append, searchable language-specific list and editor. Nothing is auto-inserted. Follow-up date picker + 3/5/7/14/30-day shortcuts. |
| useRxAutosave.ts; lib/rx/local-drafts.ts; actions/drafts.actions.ts | Cloud + immediate local backup, doctor/patient/source keys, timestamp reconciliation, serial/debounced cloud writes, online retry, corruption/quota handling and explicit sync status. Opening another patient loads that patient's draft before writing, so selecting a patient cannot overwrite an existing draft with a blank form. |
| RxBuilder.tsx; RxSections.tsx; unchanged scroll-reservation helper | Pinned patient identity/allergies and measured sticky action-bar space preserved, with inline Save-disabled reason. Fresh patient context is fetched for local recovery; if only device context is available, an explicit verify-identity/allergies notice appears. |
| prescription/draft schemas; prisma/schema.prisma; 202611070007_rx_workflow migration | Follow-up persistence and additive workflow/default fields. Server recomputes structured quantity rather than trusting submitted quantity. Existing prescriptions/catalog data preserved. |
| RxPDFDocument.tsx; RxPreview.tsx | New food instruction, explicit calculated total and optional follow-up date appear in preview/saved PDFs. Actual A4/A5 rendering with Devanagari advice tested. Printing redesign/sharing from N3 is not included. |
| DevRxProfiler.tsx; lib/rx/metrics.ts; scripts/benchmark-rx-core.cjs; docs/PERF_BUDGET.md | Development-only numeric React/input/add-four/save instrumentation, bounded memory samples, no PHI/event values recorded. Synthetic core benchmark provided; real browser/device samples still blocked. |

## Draft behavior and limits

A local entry is capped at 512 KiB and the application's combined local entries at 4 MiB (UTF-16 value-size estimate; browser quota can be smaller). No raw photo is embedded; handwriting uses bounded vectors and the existing private photo ID. Invalid/oversized entries show a warning while cloud saving can continue. Old clean entries expire after seven days; unsent dirty entries are not silently evicted or expired. Successful final save clears its cloud and local draft; a completion tombstone prevents restoration of a stale cloud copy if cloud deletion fails.

On boot a newer dirty local timestamp wins over cloud.updatedAt; otherwise cloud wins. This is whole-draft selection, not a field merge. Cross-device clock skew and simultaneous editing of the same patient's draft remain limitations: cloud writes are still last-writer-wins across devices/tabs. A long offline edit can be superseded by a genuinely newer cloud draft. Review recovered entries. No service worker or fully offline page boot/sign-in was added (N7). The page must already be loaded before connectivity drops; the Next shell still needs a connection after a full offline navigation.

Device drafts contain clinical data in browser localStorage. Doctor/patient keying prevents accidental application mixing; it is not encryption against another person with browser/device access or an XSS compromise. Use a locked clinic device/browser profile. Logging out does not delete unsent drafts. Application backups do not include local unsent edits. Clearing browser storage removes them. Clinical data is never included in new logs, metrics, advice searches or URL query values; URLs use record IDs.

The remembered N1 usual values are learned when adding a brand in the picker. Later inline row edits change the current Rx; they do not separately relearn defaults. SOS/QID totals are intentionally unset rather than inferring a fourth/as-needed dose from a three-slot grid. These are doctor controls and arithmetic, not prescribing recommendations or an interaction/allergy engine.

## Verification

- `npx tsc --noEmit` and `npm run build` pass, including lint/type checking.
- 21 pre-existing regression suites pass; six new N2 suites cover dose/history math, local restore/cache/caps, actual autosave-hook recovery/retry, workflow-action ownership and validation, actual additive SQL/RLS, and actual A4/A5 PDF rendering (27 total suites).
- Live metadata: all 15 migrations applied; 120 starter snippets across two doctors (40/language), private new tables, 94,165 brands/267 legacy presentations preserved. No production test patient/Rx created.
- No package/dependency/lockfile, environment file, auth/middleware, Storage access or existing security-policy changes. New workflow tables follow the established server-only access pattern. All new public actions derive active doctor identity on the server, scope reads/writes and sanitize errors. Repeat requires both Rx ownership and matching patient owner; draft recovery rechecks ownership server-side. Synthetic cross-doctor/anonymous and permissive-policy regression tests pass.
- Browser attachment still fails with `browser.user is unavailable`. Actual iPad touch drag, keyboard/zoom overlap, signed-in save, offline physical-device flow, and measured React/UI timings remain open. See PERF_BUDGET.md/BLOCKERS.md.
- Existing backup/restore, admin runtime role, provider-plan and earlier operational/advisory findings remain open. N2 does not resolve N7 or provide a new independent security audit.

## Review checkpoint before N3

1. With a synthetic patient, search four brands, select pattern/food/duration, edit and reorder, remove/Undo, Undo/Redo; confirm the saved PDF matches.
2. Repeat last Rx, confirm, change a medicine and save; verify original unchanged and today's date used.
3. Start an unsaved draft, disconnect, edit, refresh when the page shell can load, reconnect and confirm correct patient + newest entries. Test patient switching and second doctor's isolation.
4. Review all starter advice translations/clinical applicability; edit/delete entries and confirm deletion persists.
5. Capture the real performance and iPad/Safari acceptance listed in PERF_BUDGET.md. Use synthetic records and avoid PHI in exported traces/screenshots.

Release details and post-deploy checks are recorded below after the deployment completes. Stop here; N3 requires user review.
