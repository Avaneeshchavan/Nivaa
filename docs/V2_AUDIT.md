# Nivaa V2 N0 audit

## Scope and evidence

Audit completed before application code changes on branch `v2/audit-fixes`, created from `codex/template-polish-security-handoff` at `b6a05a1`. Production application code is `96391d0`; the intervening commit changes four handoff/status documents only. Baseline file/line references below refer to `b6a05a1`.

Read AGENTS.md, TASKS.md, PLAN_AUDIT.md, the root CLAUDE_HANDOFF.md, SECURITY_REVIEW.md and the N0 prompt. The prompt's `docs/CLAUDE_HANDOFF.md` path is absent. The actual handoff is at the repository root. Installed Next 15.5.28 lacks the local docs directory named in AGENTS.md, so official version-15 route-handler guidance was consulted.

Source review covers the builder, shared medicine picker/action, template editor/selector/actions, patient list/history, PDF route, search consumers/routes and draft autosave. A medicine-only live database check used verified TLS and returned zero matches for all four reported queries. No patient records were read for this audit. Layout findings distinguish code/breakpoint inspection from rendered-browser evidence.

Severity describes clinic impact. High items can prevent routine prescribing or expose identifying searches. Medium items create workflow, scale or accessibility risks. Low items are narrower usability gaps.

## Baseline findings

| Area | Severity | File / line | Finding and proposed fix |
| --- | --- | --- | --- |
| a. Missing brands and search behavior | High — product | `prisma/schema.prisma:102`, `app/api/medicines/route.ts:20`, `prisma/medicine-catalog.ts`, `prisma/ayurvedic-catalog.ts` | Medicine contains id, name, system, generic, form and timestamps. There is no manufacturer/brand/composition relation or doctor preference model. Search uses Prisma `contains` plus insensitive mode on name/generic, translating to substring ILIKE. It sorts by name and returns 10 records. Trigram GIN indexes accelerate substring matching but implement neither similarity ranking nor typo tolerance. Company is not searched. Live counts are 202 ALLOPATHY and 65 AYURVEDIC. `ondem`, `ondem md`, `uprise d3` and `aciloc 300` each returned zero catalog matches. Missing catalog entries cannot be repaired through query ranking. Import, brand model, aliases and usage learning belong to N1. |
| b. Custom entry and duplicates | High — workflow/data | `components/prescriptions/MedicineAutocomplete.tsx:60`, `:169`, `actions/medicines.actions.ts:8`, `lib/medicines/catalog.ts:4` | Search text supplies the name. Strength and free-text form appear above the create row inside the command list. There is no company or composition input. Server validation bounds individual fields and appends strength to name, but combined length can reach 241 while Rx names are capped at 240. The hash normalizes NFKC, case and whitespace. Upserting by that hash does not detect legacy rows with generated IDs, and hyphen variants have different hashes. A normalized-name/form group check found no current duplicates. N0 will provide an explicit ordered custom form, persist manufacturer and generic, enforce presentation uniqueness against legacy rows and concurrent requests, and report an existing match. Preserve existing clinical display names and stored Rx snapshots. |
| c. Bottom bar overlap | Medium — accessibility/workflow | `components/prescriptions/RxBuilder.tsx:220`, `:231`, `app/(dashboard)/layout.tsx:39` | The last form column contains a bottom-sticky action bar. Main is the scroll container and has ordinary page padding only. No reservation follows the actual bar height, wrapped buttons/errors or device safe area. Scroll/focus targets can sit behind the bar. N0 will measure its border-box height, reserve that height plus safe-area space in Main, and set scroll padding. Restore normal page behavior on unmount. |
| d. Disabled Save explanation | Medium — workflow | `components/prescriptions/RxBuilder.tsx:124`, `:237`, `lib/validations/prescription.schema.ts:30` | Both buttons share a Boolean with no inline explanation. Actual behavior permits diagnosis-only, typed-advice-only and handwriting/photo-only prescriptions. A blanket requirement for one medicine would change an existing workflow. Vitals can remain invalid while the buttons appear enabled, with errors discovered only on click. Derive a reason from the same content/measurement/payload constraints and busy flags, show it beside the controls, and reference it from both buttons. |
| e. Patient context visibility | High — clinical workflow | `components/prescriptions/RxBuilder.tsx:139`, `:153` | Patient name/date and allergies are an ordinary section in the form column. They scroll away. Age and sex are absent from this section even though DOB/gender data is available. N0 will pin a compact full-width strip inside the existing main scroller, show age/sex and allergy status, and make long allergy details accessible without letting the strip consume the page. |
| f. Medicine system control | Low — usability | `components/prescriptions/MedicineAutocomplete.tsx:21`, `:119`, `app/api/medicines/route.ts:22` | The visible dropdown suggests a required step, but its default is already ALL and the API already searches both systems without a recognized filter. No extra tap is technically required today. N0 will make this default explicit, replace the dropdown with optional filter chips and show Allopathy/AYUSH result badges. Keep internal AYURVEDIC values for compatibility. |
| g. Template scalability | Medium — scale | `components/prescriptions/DiseaseTemplateSelector.tsx:62`, `actions/templates.actions.ts:17`, `prisma/schema.prisma:116` | First five templates appear as full-name buttons and the remainder in an unsearched select. There are no favorites/recents or preferred short labels. Template loading reads the entire doctor's collection. N0 audits this; template search/favorites/recents belong to later prompts and are not included in the six N0 fixes. |
| h. Identifying search URLs | High — privacy | `app/api/patients/route.ts:19`, `app/api/patients/duplicates/route.ts:16`, `components/patients/SearchInput.tsx:28`, `app/(dashboard)/patients/page.tsx:6`, `scripts/check-patient-search.mjs:15` | Current directory, global search, patient picker and duplicate-warning clients already use POST. Legacy GET handlers remain. SearchInput still has an optional URL-navigation fallback, the Patients page consumes q from GET, and the benchmark still uses query strings. Confirm all callers, remove the GET implementations and URL-producing fallback, stop consuming q on the page, and update the benchmark to POST. Previously written browser/platform logs require separate owner retention handling. |
| i. Logs and exceptions | High — privacy under failure | `actions/patients.actions.ts:31`, `:73`, `actions/prescriptions.actions.ts:25`, `actions/drafts.actions.ts:23`, `actions/templates.actions.ts:29`, `app/api/prescriptions/[id]/pdf/route.tsx:78` | App console errors are already constant messages. However, unhandled Prisma exceptions can include invocation arguments such as diagnosis, notes or draft JSON when the framework logs them. Several client catches also display arbitrary error.message values. N0 will replace unexpected data-action errors with constant safe errors without retaining the original cause, preserve only known constant business errors, and keep client feedback generic. Auth, RLS and middleware remain outside the change scope. |
| j. Query shape and bounds | Medium — scale | `actions/patients.actions.ts:19`, `:31`, `:55`, `:132`, `app/(dashboard)/patients/[id]/page.tsx:74` | Directory uses at most 50 patients and one latest-visit date per patient. Search uses one indexed candidate-ID statement plus a bounded fetch. Prescription patient lookup caps at 25. There is no explicit per-patient database query loop in the directory. Prisma relation loading can use batched statements per relation, so it should not be described as a proven N+1. Full patient history still has no visit or nested-Rx limit and renders every returned visit. Pagination and realistic query/latency measurement are later work. |
| k. Feedback states | Medium — usability | `components/prescriptions/RxBuilder.tsx:26`, `:116`, `components/prescriptions/MedicineAutocomplete.tsx:140`, `components/settings/SettingsView.tsx:186`, `app/(dashboard)/loading.tsx:1` | Builder save errors, preview loading, draft status, picker empty/search errors and template save status exist. Missing pieces include the disabled-save reason and an explicit custom-form submitting/duplicate result. Initial page failures rely on framework handling rather than a contextual retry screen. Patient missing/error handling and very large history need refinement later. Implement the N0-specific feedback only. |
| l. Accessibility | Medium — usability | `components/prescriptions/MedicineAutocomplete.tsx:169`, `components/ui/command.tsx:20`, `components/settings/SettingsView.tsx:482`, `components/prescriptions/HandwritingEditor.tsx:105` | Many existing controls already meet 44 px and have labels. The custom inputs inside a command group mix form controls with list navigation. The main paper selector uses an implicit label. Some template badges use small text. Handwriting has typed advice as an alternative, but its drawing surface cannot be operated through ordinary keyboard controls. New custom fields will use explicit labels and predictable DOM order outside the command list; chips/buttons will have 44 px targets; Save will explain its state; the pinned strip will preserve long text access. Full contrast, keyboard and physical-device certification is not claimed by source inspection. |

## Responsive source checks

The form/preview uses a single column below the xl breakpoint and two columns from 1280 px when preview is open. Main has its own scrolling area below the app header. The sidebar appears at 1024 px and changes width at 1280 px. Approximate form-area widths follow these source classes.

| Viewport width | Sidebar / main width after horizontal padding | Expected builder layout |
| --- | --- | --- |
| 768 | hidden / 712 px | stacked form and optional preview |
| 820 | hidden / 764 px | stacked form and optional preview |
| 1024 | 224 px / 736 px | stacked form and optional preview |
| 1180 | 224 px / 892 px | stacked form and optional preview |
| 1366 | 256 px / 1046 px | optional two-column preview; otherwise form capped at 896 px |

These calculations establish breakpoint intent. They do not establish actual browser element rectangles. The fix must reserve measured height rather than hardcoding one bar size. Rendered viewport checks and any browser-tool limitation are recorded in the results section after implementation.

## N0 implementation plan

1. Reserve actual action-bar height and safe area in the scroll container, with resize/focus-scroll handling.
2. Add validation-derived disabled-save explanations while preserving supported notes-only and handwriting-only Rx.
3. Search both medicine systems by default, with optional filter chips and result badges.
4. Correct the custom form, add the manufacturer field, and prevent normalized presentation duplicates without dropping existing medicine data.
5. Remove legacy search GET consumers/handlers and sanitize unexpected clinical-data exceptions.
6. Pin patient name, age/sex and allergy context above the builder.

Each numbered fix gets its own commit and appropriate regression checks. Catalog importing/ranking, offline drafts, template favorites, new PDF features, backup/role/migration simplification and the remaining V2 prompts are deferred to their requested steps. No authentication, RLS, middleware or security migration changes are included in N0.

## Results

All six N0 fixes are implemented. Baseline findings above remain frozen to the pre-fix commit; the table below describes the resulting code. No N1–N7 implementation was started.

| Fix | Commit | Result / current evidence |
| --- | --- | --- |
| 1. Action-bar overlap | `68899f3` | `RxBuilder.tsx:43`, `:240`, `lib/prescriptions/scroll-reservation.ts:2`, `app/globals.css` measure the rendered bar with ResizeObserver and reserve its actual height plus the bottom safe area in the dashboard scroll container. Reservation and scroll padding follow wrapped controls/errors and restore previous styles on unmount. |
| 2. Disabled-save reason | `5dedb8d` | `lib/prescriptions/save-state.ts:13`, `RxBuilder.tsx:91`, `:242` derive an inline status from patient selection, content, busy flags and the same visit/prescription schemas used by save. Both buttons reference the explanation. Diagnosis/advice/handwriting-only saves remain supported. |
| 3. Medicine systems | `30f5d82` | `MedicineAutocomplete.tsx:104` starts with All medicines and offers optional 44px Allopathy/AYUSH chips. Search results show system badges. Internal AYURVEDIC values remain compatible. |
| 4. Custom medicine | `afd7112` | `CustomMedicineForm.tsx:10`, `actions/medicines.actions.ts:9`, `lib/validations/custom-medicine.schema.ts:7`. Ordered, labeled name/form/strength/company/composition fields are outside the command list and do not nest a form inside the template editor. Save is the final action. Server validation normalizes display spacing and bounds the combined name/strength to 240 characters. A database expression index prevents case/spacing/hyphen/Unicode variants, including legacy IDs and concurrent requests. Existing matches return unchanged with “Already exists: <name>”. Different strengths/forms remain distinct. Manufacturer is persisted; generic uses the existing field. Search responses use private no-store so previous misses do not hide new records. |
| 5. Search privacy and error redaction | `3ee6d1e` | The two patient search routes export POST only. `SearchInput.tsx:9` requires its search callback; the Patients page ignores q; the benchmark sends POST JSON. Existing directory/global/picker/duplicate consumers all use POST. `lib/security/action-error.ts:10` wraps 20 clinical-data action boundaries, preserving only fixed business messages and dropping original exceptions/causes. Prisma logging is explicitly disabled with minimal error formatting. Patient/settings feedback is fixed text. No auth logic, middleware, RLS or security migrations changed. |
| 6. Pinned patient context | `9bc8982` | `RxBuilder.tsx:152`, `PatientStrip.tsx:9`, `lib/prescriptions/patient-age.ts:2`. A full-width sticky strip shows name, age/sex and allergy status. Unknown allergies say “Allergies not recorded”. Long text wraps/clamps with a 44px Read allergies dialog. The measured strip height also sets focus-scroll top padding. Age follows the clinic's India calendar day. |

### Verification performed

- `npx tsc --noEmit`: passed after the final production build.
- `npm run build`: passed, including Next's lint/type checks, with no warnings on the final run.
- Six new regression suites passed: `check-rx-scroll.cjs`, `check-rx-save.cjs`, `check-medicine-picker.cjs`, `check-custom-medicine.cjs`, `check-search-privacy.cjs`, `check-patient-strip.cjs`.
- Ten existing suites passed: doctor access, query budget, workflow notes, drafts, PDF security, database isolation, private prescription storage, composed Storage policies, security operations and backup encryption. The template ownership test now expects a redacted error while retaining its cross-doctor rejection assertions.
- The custom-medicine suite runs the real migration and action SQL against a local PostgreSQL-compatible engine with all 267 seed presentations, legacy generated IDs, normalized variants, concurrent inserts, invalid input, metadata preservation and transactional rollback on existing collisions. It creates no remote test medicines.
- The privacy suite injects synthetic private values into database/SDK failures across 20 actual data-action exports, checks safe messages/stacks/no original cause/no console output, validates POST route bodies and checks anonymous denial. Route modules have no GET export; Next supplies method-not-allowed after middleware admits an authenticated request. Anonymous HTTP requests continue to redirect to login. A signed-in HTTP 405 check was not performed.
- Local production HTTP: all 15 smoke checks plus eight explicit anonymous redirect checks passed. These verify login/security headers/protection, not signed-in prescribing.
- Hosted migration `202611070005_custom_medicine_identity` applied successfully over verified TLS using the unchanged migration helper. All 13 tracked migrations are applied. Live metadata confirms manufacturer present, the unique index valid and zero normalized duplicate groups. Catalog counts remain 202 ALLOPATHY / 65 AYURVEDIC. No patient records were read for these N0 database checks; no patient data or .env files were changed.
- No dependencies were added or changed. `git diff --check` passed.

### Verification limits and remaining work

The browser integration again failed to attach the existing Nivaa tab with `browser.user is unavailable`. The documented alternative using the existing browser binding failed the same way. No screenshots or rendered geometry were obtained. The five width checks above are source/breakpoint calculations only. Actual Safari/iPad scrolling, focus/virtual-keyboard behavior, sticky element rectangles at 768/820/1024/1180/1366px, touch interaction and screen-reader acceptance remain device checks. Component tests cover ordered controls, 44px classes, state transitions, accessibility labels, long allergy text and dynamic measurements, but do not establish rendered-device behavior. See BLOCKERS.md.

The four reported brand queries still have no seeded brand to find. N0 enables corrected manual custom entry; catalog import, composition/company search, typo tolerance and doctor usage learning are N1. Offline drafts, template search/favorites, printing upgrades and other V2 features remain deferred. The full backup/restore drill, runtime least-privilege role, dependency triage, provider plan/logging decisions and authenticated latency measurements remain open. Do not interpret a passing encryption test as a completed clinic restore.

### Release

Released November 7, 2026 from tracked source commit `c82807c` on
`v2/audit-fixes`, pushed to the existing `Avaneeshchavan/Nivaa` repository. The six
application fixes end at `9bc8982`; `c82807c` adds the audit/task/security handoff.
The subsequent release-record commit changes documentation only.

- Production: https://nivaa-kohl.vercel.app
- Deployment: `dpl_5kyNTG8jPfftSZrHCjoNsiGhcSav`, READY.
- Immutable deployment: https://nivaa-4zg4bqv2d-avaneeshchavans-projects.vercel.app
- Inspector: https://vercel.com/avaneeshchavans-projects/nivaa/5kyNTG8jPfftSZrHCjoNsiGhcSav
- CLI: Vercel 65.12.1. Existing project/account link and production environment
  settings were reused. Deployment used a Git archive of committed files, excluded
  every `.env*` file and copied only the ignored project-link metadata. No local
  secrets were uploaded and no environment configuration was changed.
- Vercel inspect confirmed production Ready, the established alias and `bom1`
  function placement. Remote build completed successfully.
- Post-release: all 15 public/anonymous smoke checks and eight explicit redirect
  checks passed on the production alias. Login loaded with the expected security
  headers; protected routes and POST patient searches required sign-in.
- The temporary local production server was stopped. Signed-in browser/device
  acceptance remains pending for the integration limitation recorded above.

### Reference guidance

- [Next.js 15 route handlers](https://nextjs.org/docs/15/app/api-reference/file-conventions/route): supported methods and automatic method-not-allowed behavior.
- [PostgreSQL string normalization](https://www.postgresql.org/docs/current/functions-string.html) and [INSERT conflict handling](https://www.postgresql.org/docs/current/sql-insert.html): catalog normalization/index and atomic duplicate handling. The actual SQL was tested locally and applied on the hosted server.
