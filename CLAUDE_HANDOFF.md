# Nivaa implementation and review handoff

> **V2 N1 update:** Read [docs/N1_REPORT.md](docs/N1_REPORT.md) first. The owner
> supplied NRCeS and confirmed an applicable Affiliate License. N1's private catalog,
> importer, ranked search, doctor preferences and picker are implemented. 93,897
> source brands imported, 267 legacy presentations preserved; repeat import adds
> zero duplicates. Doctor/iPad acceptance and actual top-100 coverage remain open.
> N2 has not started. Earlier N0 audit remains in docs/V2_AUDIT.md; backup/restore
> and runtime database privilege reduction remain unresolved operational work.


Prepared November 7, 2026 for an independent Claude critique of UI, workflows, architecture and security. This file contains implementation details and verification evidence, with remaining gaps explicitly identified. It contains no live patient records or credentials.

## Project and review scope

Nivaa is an iPad-first prescription and patient-record application for a small clinic with two doctors, many repeat patients, allopathic and Ayurvedic prescribing, and a transition from handwritten paper prescriptions. The priority is a fast consultation with large controls, clear patient/allergy context and straightforward printing.

Repository is `https://github.com/Avaneeshchavan/Nivaa`. Current work is on `codex/template-polish-security-handoff`, based on `eb19cbb` from `codex/faster-workflows-notes`. Production is `https://nivaa-kohl.vercel.app`. The exact release SHA and final deployment checks are recorded at the end after publication.

This pass addressed the supplied template-editor screenshot, audited the planning documents against source/hosted metadata, completed relevant launch/security work, performed a security review and prepared this handoff. The supplied master plan also covers unrelated projects. Only its Nivaa goals belong to this review.

## Planning documents and completion

`AGENTS.md` currently contains Next.js agent rules. The installed Next 15.5.28 package lacks the referenced local docs directory, so official Next 15 guides were used for the relevant APIs. `TASKS.md` is updated against the implementation. `docs/PLAN_AUDIT.md` gives the task-by-task comparison.

The two Claude context-state files were identical old November 2 snapshots. Their original content is preserved, with a notice pointing at current STATUS, PLAN_AUDIT and this handoff. The old context describes defects that have since been fixed, including the missing Templates route and starter root page. It should be read as history.

Tasks 0–2 are implemented, with authenticated timing and physical-device checks still pending. Security/admission/audit work and deployment/smoke documentation are implemented. Task 3.4 remains unchecked because the clinic's complete encrypted backup and isolated restore drill have not been performed. Optional OCR and PWA/offline work remain deferred. The original model-routing preference for an Astra review is historical planning context. This report is the current Codex review, and independent critique is the next step.

## Current architecture

- Next.js 15.5.28 App Router, React 19.2.4, TypeScript strict, Tailwind 4 and Base UI/shadcn components.
- Supabase email/password Auth and Storage. Exactly two server-configured allowed emails must map to confirmed Auth identities and active Doctor rows.
- Prisma 7.8 with the pg adapter and PostgreSQL. The generated client is under ignored `lib/generated/prisma`, generated on installation.
- React Hook Form and Zod 4.6.7 for forms/server validation. Zustand holds the working Rx and clinic display state in memory.
- React PDF for the optional browser print preview and authenticated server PDF rendering. A bundled font supports Devanagari text.
- Vercel production uses Node 22, an explicit Next preset and Mumbai functions, matching the existing Supabase region.

The database has Doctor, Patient, Visit, Prescription, Medicine, DiseaseTemplate, RxDraft, AuditLog and RateLimit. Nine application tables have RLS and deny direct browser-role access. Prisma uses a trusted server login, so action ownership checks remain essential.

Five required app variables remain NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, DATABASE_URL, DIRECT_URL and ALLOWED_DOCTOR_EMAILS. Public keys are constrained by RLS. Database URLs and the admission allowlist are server-only. Real `.env` files were not edited, staged or deployed.

## Cumulative product implementation

### Authentication and patient records

Every non-public route requires an allowed Supabase identity. Dashboard/root rendering and data actions independently require the active Doctor mapping. `/` redirects to Patients or Login. Password sign-in returns generic failures, applies an atomic shared per-address budget, and requests sign-out if provisioning or login auditing fails.

Patient registration/editing validates names, dates, phone, address and allergies. A similar-name/same-phone warning links to possible duplicates while allowing a deliberate save. Search includes name, phone, prior diagnosis and medicine names. Trigram/history indexes support those paths. Results and payload sizes are bounded.

Patient history displays visit dates, diagnoses, measurements and prescription links. All prescriptions for a visit are accessible. An empty visit shows No Rx. Full-record reads and primary saved writes are audited. Existing data ownership filters are preserved and strengthened in nested reads and write predicates.

### Prescription workflow

The builder starts from a selected patient or an owned past Rx, retrieves its draft and templates, and preserves allergy context. Diagnosis, medicines, measurements and typed advice remain editable. A past prescription can be duplicated into a new visit dated today. The physician reviews and saves a new record.

The catalog contains 202 allopathic and 65 Ayurvedic presentations. The system filter and custom-entry action support both workflows. The Ayurvedic seed uses National AYUSH Mission names/forms and includes no dosage guidance. Brand-specific presentations remain a physician-entered catalog task. Ayurvedic selections require dosage, frequency and duration entry.

The main builder and template editor share the same medicine picker. Custom entries persist in the shared catalog. Rx entries remain editable after insertion. Changing from an already selected patient clears all clinical entries, with a confirmation if the builder contains work. This fixes accidental carry-over of another patient's medicines, notes or handwriting.

Visit measurements include weight, BP, temperature and SpO2. Patient allergies appear on the patient page and in the builder, and populated clinical header fields appear in the PDF.

### Drafts and performance

Working drafts are stored online under a doctor/key pair. The keys distinguish a patient-entry URL, duplicate-source URL and generic new-Rx page. Autosave waits for 1.5 seconds of inactivity, queues saves, flushes on normal unmount and clears the saved draft after a successful Rx save. It is not an offline recovery system. Closing a tab or losing connectivity can still leave the latest unsent edits unavailable.

Doctor resolution is memoized for one server render and never shared across users/requests. Directory queries fetch display fields and the last-visit date. History reads fetch Rx identifiers/dates instead of duplicating medicine JSON. Builder startup queries run concurrently where independent and load only the selected patient's summary. Patient editing renders on the server, and patient updates combine ownership with the mutation predicate.

The print renderer and branding downloads load only after Show print preview. Saving and printing can proceed independently. Runtime pools have at most three connections per process. Functions run in Mumbai. Local production output reports about 220 KB initial JavaScript for the prescription builder. This is a bundle measurement. Authenticated end-to-end latency under realistic clinic data remains unmeasured.

New patient search and duplicate-warning requests use cancellable POST route handlers, so search can run alongside Server Action draft writes while keeping terms out of normal browser URLs. Legacy GET search routes remain temporarily available for old clients and are an explicit privacy-transition finding.

### Handwriting and printing

New prescriptions support vector handwriting with pointer capture, undo, clearing and cloud draft support. Input accepts mouse, finger and standard Pencil pointer events. The drawing state commits at stroke end, which avoids a server write for each pointer movement. No physical Pencil pressure/palm-rejection certification has been performed.

Attach paper note accepts JPG/PNG/WebP in the browser. The normal browser flow resizes to a maximum dimension of 1400 pixels, converts to JPEG, and strips original metadata through canvas conversion. The server caps each note photo at 750 KB, checks JPEG magic/MIME, assigns a random image UUID and uploads under the authenticated doctor's UUID. Photos are read through an authenticated private route.

Saved prescriptions have Add / edit notes, with ownership, bounded content, expected-updatedAt concurrency checks and a transactional audit event. New-Rx handwriting autosaves with its draft. Saved-note edits require Save notes. A duplicated prescription starts with blank handwriting for the new visit.

Drawing and photo pages are patient/Rx/date labelled and append to A4/A5 prescription PDFs. A synthetic PDF check caught an A5 photo-page overflow and its image height was corrected. The preceding feature pass visually checked synthetic drawing/photo pages in A4/A5. Current browser/Pencil/printer verification remains pending.

PDF generation validates the Rx, patient and visit ownership/consistency before rendering. Private PDF archives use the Auth UUID folder. Signed access lasts 60 seconds and is not persisted in Prescription.pdfUrl. An authenticated inline fallback remains available if archive upload fails. Branding and private signature feed both printed output and preview.

## Screenshot-driven template UI fixes

The supplied screenshot showed a cramped right-side panel, fields flush against the edge, truncated medicine names, small remove controls and a sparse medicine-entry section. The old editor duplicated medicine-search code and did not offer the full main-picker experience.

`components/settings/SettingsView.tsx` now uses a full-width phone panel and a larger tablet/desktop panel, padded header/content, a scrollable body and fixed Save/Cancel actions with safe-area spacing. The close control has reserved header space. Saved medicine names and instructions wrap. Remove and edit controls have 44-pixel targets. Existing medicine details can be edited inline. The main medicine picker supplies Ayurvedic filtering, custom entry and dosage controls.

Save/error/success states are visible in the editor/page. Saving disables duplicate submission and dismissal. Templates are validated on the server. Common-template loading uses a per-doctor advisory transaction lock and stable identifiers to avoid duplicates and preserve edits. Template cache invalidation covers Settings, Templates and the new-Rx route.

The shared Sheet overlay uses a simple dim backdrop, and side panels use the dynamic viewport height. This reduces expensive backdrop filtering and supports a clear, separated editor. Rendered visual confirmation on the target browser remains pending because the browser integration could not attach.

## Security changes and operational work

### Verified database TLS

The previous runtime pool had no explicit SSL configuration, and the configured URI had no SSL mode. The runtime now uses `lib/database-connection.ts` to require CA/hostname verification for remote databases and discard URL flags that could weaken it. The public Supabase root CA is tracked and included in Next function traces. A live connection verified authorized TLS 1.3.

The native Prisma migration client failed to trust the provider's CA directly on this machine. `scripts/migrate-verified.mjs` offers only status/deploy operations and binds a temporary 127.0.0.1 listener. It negotiates PostgreSQL TLS to the real server, verifies certificate/hostname, then forwards startup/auth data. Only loopback uses a non-TLS PostgreSQL connection. Credentials remain in the child environment, with no URL in command arguments. This is a local workaround that warrants independent review.

Twelve tracked migrations are now applied. The new security migrations add private RateLimit/AuditLog tables, an immutable audit trigger, Doctor.active and an active-member Storage guard. No clinic data reset or drop occurred.

### Abuse limits and audit

Shared PostgreSQL counters are atomic across Vercel processes. Login permits 10 attempts per approved address per 10 minutes. PDF generation permits 60 per doctor per minute. Note/signature uploads share 30 per doctor per 10 minutes. Direct Supabase Auth requests still rely on provider limits and deserve owner review.

Audit rows store doctor ID, action, resource ID and time, with no clinical-text/search/password column. Primary patient, prescription, notes, profile and template writes commit with their audit event. A trigger rejects audit UPDATE/DELETE/TRUNCATE. A live Prisma synthetic transaction proved patient/audit rollback and persisted no test rows.

Coverage currently focuses on full records and successful primary operations. Directory results, draft autosaves, direct Storage reads and failed attempts do not all create application events. Storage and PostgreSQL cannot share one database transaction, so an upload can complete before subsequent audit insertion fails. These are review findings, not complete audit-coverage claims.

### Admission, Storage and browser protection

App admission now checks Doctor.active. Storage requires the matching active, confirmed, non-banned Auth/Doctor mapping in addition to the existing owner/UUID-folder rules. Its SECURITY DEFINER function has a fixed search path, no public execution grant and a boolean-only return value. Tests verify disabled/mismatched doctors lose access. Signed PDFs retain their short bearer lifetime after revocation.

Three buckets are private — prescriptions, prescription-notes and signatures. Logos holds public branding. Removing a note photo detaches it while keeping the immutable uploaded file, preserving existing references/drafts. Retention and capacity monitoring remain owner choices.

CSP, frame-embedding denial, nosniff, no-referrer, HSTS and a restrictive permissions policy were added. CSP allows required inline Next bootstrap/styles and blob PDF resources. Full Safari/PDF compatibility is a pending browser check. Server schemas now bound template/profile/patient/item fields and record identifiers. Search bodies are limited to 4 KB. Generic console errors avoid emitting query/clinical text.

### Dependencies and backups

The security pass patched the existing root Zod range to installed 4.6.7 and overrides proxy-addr to compatible 2.0.8. Two installed packages changed. The final production dependency audit reports 29 entries — 0 Critical, 17 High, 10 Moderate, 2 Low. Remaining findings include tooling/build chains and need a separate reachability/upgrade pass.

`scripts/backup.sh` and `backup.mjs` implement public-schema pg_dump, paginated exports from four Storage buckets, archive metadata/migrations, AES-256-GCM encryption, safe file modes and overwrite protection. Tests exercise decryption, incorrect passwords, tampering and existing-output preservation. Full backup execution requires pg_dump/pg_restore, a local Storage service-role key, an owner-held passphrase and a private destination. An isolated restore also requires Auth UUID and Storage ownership reconciliation. Task 3.4 remains open.

`docs/BACKUPS.md` includes the weekly procedure, private off-device copy, isolated restore drill, pause/resume contingency and a non-patient-data availability check. A scheduled backup/keep-alive and a paid hosting decision have not been configured by this source change.

## Files to inspect first

| Area | Main files |
| --- | --- |
| Screenshot UI | components/settings/SettingsView.tsx, components/ui/sheet.tsx, components/prescriptions/MedicineAutocomplete.tsx |
| Template persistence | actions/templates.actions.ts, lib/validations/template.schema.ts |
| Patient/Rx lifecycle | actions/patients.actions.ts, actions/prescriptions.actions.ts, components/prescriptions/RxBuilder.tsx, stores/rxBuilderStore.ts |
| Handwriting | actions/handwriting.actions.ts, components/prescriptions/HandwritingEditor.tsx, PrescriptionNotesForm.tsx, lib/validations/handwriting.schema.ts |
| Printing | app/api/prescriptions/[id]/pdf/route.tsx, components/prescriptions/RxPDFDocument.tsx, RxPreview.tsx, lib/pdf-assets.ts |
| Auth and controls | middleware.ts, actions/auth.actions.ts, lib/auth/doctor-access.ts, lib/security/audit.ts, rate-limit.ts, next.config.ts |
| Database TLS | lib/database-connection.ts, lib/prisma.ts, prisma.config.ts, scripts/migrate-verified.mjs, public CA certificate |
| Storage/DDL | prisma/schema.prisma and tracked migrations, especially 202611070003 and 202611070004 |
| Backup/recovery | scripts/backup.sh, backup.mjs, backup-crypto.mjs, docs/BACKUPS.md |
| Current evidence | docs/STATUS.md, PLAN_AUDIT.md, SECURITY_REVIEW.md, DEPLOY.md, BLOCKERS.md |

## Verification performed and its limits

TypeScript strict checking and production builds pass. Synthetic regressions exercise admission/session cleanup, foreign-ID denial, draft isolation, prescription/notes ownership, concurrency, patient-switch clearing, bounded input, template seed idempotency, query payloads, PDF route authorization, composed Storage RLS and revoked/mismatched membership. Real local PostgreSQL tests via PGlite verify atomic rate budgets, audit immutability and denied browser-role access.

Live checks use security metadata/aggregate counts and synthetic transaction rollback. They confirm two active approved mappings, disabled signup, protected tables/buckets, the membership function's privileges and certificate-verified connectivity. Medicine counts remain 202 allopathic + 65 Ayurvedic. No real clinical content was copied into these reports.

The current source credential scan found no real configured database/server credential or private-key pattern. Real environment files remain ignored. The CA is a public certificate. This scan does not establish the state of external secret stores or inaccessible logs/history copies.

Browser tooling lists the signed-in clinic tab but every attach attempt reports `browser.user is unavailable`. Native access to the Codex app is explicitly denied. Consequently, signed-in screenshot verification, physical Pencil/keyboard/printing, real-session Storage/CDN expiry and authenticated latency are unverified. Anonymous smoke checks can establish redirect/header behavior, not the complete consultation workflow.

The remaining security findings include full recovery evidence, administrative runtime DB privilege, dependency maintenance, audit coverage/retention, decoded image limits, legacy search URLs, provider SSL enforcement/MFA, clinical revision history and inherited template review. See SECURITY_REVIEW.md for severity, file references and concrete fixes.

## Requested Claude critique

Please critically assess the implementation and give prioritized changes with concrete file references and acceptance criteria. Distinguish source evidence, actual executed checks and assumptions requiring device/hosted verification.

Focus on the template editor at iPad portrait/landscape sizes, virtual-keyboard/footer interaction, nested search/select/focus behavior, medicine-detail editing, saving and error recovery. Review tap counts in a repeat visit, clarity of patient/allergy context, accidental patient switching, handwriting/photo attachment and print-preview behavior.

Review the local verified migration bridge, runtime TLS/CA tracing, membership SECURITY DEFINER function, owner checks, transaction/audit behavior, rate-limit reset boundaries, CSP/PDF compatibility and backup encryption/restore procedure. Identify any further security issue by reachable attack path and severity rather than dependency count alone.

Evaluate final-save request idempotency after a lost success response, draft persistence during tab closing/network failure, editing conflicts, immutable prescription/addendum needs, pagination and audit growth as clinic use increases. Have clinical prescribing text reviewed by the doctors. Treat OCR/offline PWA as optional future work following observed parent usage and consent decisions.

## Release verification record

- Application release commit is `96391d0` on `codex/template-polish-security-handoff`, pushed to the existing Nivaa repository.
- Vercel deployment `dpl_6sbFwax3bPRnXR6bkKRqRhiMskfY` is READY. Its production alias is `https://nivaa-kohl.vercel.app`. Inspection confirms `bom1` functions. The cloud build completed in approximately 1 minute 9 seconds.
- `npx tsc --noEmit` and `npm run build` passed for the final source. Admission/session-cleanup, draft, note, patient-switch, query-budget, PDF, Storage, SQL security and backup-crypto regressions passed.
- `node scripts/smoke-test.mjs https://nivaa-kohl.vercel.app` passed 15 public/anonymous checks, including the security headers and protected search POSTs.
- The deployed sign-in Server Action was exercised through its public client reference with an unapproved synthetic identity. It returned the generic denial, set no session cookie and loaded without an application error. Real doctor credentials were not used.
- `node scripts/check-availability.mjs` passed certificate-verified database and Auth availability checks without patient queries. All twelve migrations are applied.
- Final production dependency audit remains 0 Critical, 17 High, 10 Moderate and 2 Low affected package entries.
- Sixty-six staged text files were scanned before the release commit, with zero configured credential/private-key matches. Real environment files were absent from the staged release and deployment archive.
- Full backup/restore and signed-in/device acceptance remain open as described. Browser visual verification was blocked by the integration failure.

The release was deployed directly from this feature branch. Review and deliberately merge the accepted changes into the normal release branch before a later deployment from an older branch. A subsequent handoff/status-only commit records this verification and does not change application runtime code.
