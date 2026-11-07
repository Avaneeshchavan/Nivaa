# Nivaa TASKS (do in order; tick when verified)
## Phase 0 - Setup (Luna, low)
- [x] 0.1 `git init` INSIDE Nivaa root, .gitignore (.env*, node_modules, .next), initial commit. Delete orphan `clinic-app/`. Done when `git status` clean and build passes.
- [x] 0.2 Write docs/STATUS.md summarizing repo vs Claude_Context_State.md; list anything that differs.
## Phase 1 - Blockers (Sol, medium)
- [x] 1.1 middleware.ts: protect /patients, /prescriptions, /settings, /templates (all non-login routes). Test: logged-out request to /settings redirects to /login.
- [x] 1.2 app/page.tsx: redirect to /patients (or /login if no session).
- [x] 1.3 Sidebar: fix /templates 404 (create a /templates page reusing the settings template manager OR repoint).
- [x] 1.4 Patient history "View Rx": link to /api/prescriptions/[id]/pdf (target _blank); handle visits with no Rx.
- [x] 1.5 MedicineAutocomplete: allow adding a custom medicine when no match; persist it to Medicine table.
- [x] 1.6 prisma/seed.ts: 150+ common Indian generic/brand medicines (antibiotics, analgesics, antipyretics, antihypertensives, antidiabetics, antacids, antihistamines, cough/cold, vitamins) with strength+form. Add `prisma db seed` config. List any entry you're unsure of in docs/MED_REVIEW.md for the doctor to verify (do not guess dosages). (Live catalog verified at 267 presentations. Authenticated HTTP checks remain a device step.)
- [x] 1.7 package.json "postinstall": "prisma generate". Switch from `db push` to tracked migrations (`prisma migrate dev --name init`). (Thirteen tracked migrations, including the baseline, applied; see docs/DB_NOTES.md.)
- [x] 1.8 Fix StoreInitializer props (clinicName, logoUrl); merge store/ into stores/.
## Phase 2 - Doctor-workflow features (Sol, medium)
- [x] 2.1 Rx history: re-open a past Rx, "Duplicate as new Rx" (big time saver for repeat patients).
- [x] 2.2 Patient search: add phone, diagnosis, medicine search; pg_trgm; duplicate-patient warning (similar name + same phone). (Local SQL verified; authenticated HTTP timing pending; see docs/SEARCH_NOTES.md.)
- [x] 2.3 Visit fields: weight, vitals (BP, temp, SpO2), allergies banner on patient header + Rx builder. (Migration applied to the hosted database.)
- [x] 2.4 Template quick-bar in Rx builder: one-tap templates, editable after fill.
- [x] 2.5 PDF: letterhead/logo, Rx number, date, signature image upload, A4 and A5; Devanagari/Marathi text if used.
- [x] 2.6 Speed: Cmd/Ctrl+K patient search, Enter to add medicine, autosave drafts.
## Phase 3 - Security & ops (Sol medium; Astra high ONCE for review)
- [x] 3.1 Supabase RLS on all tables + storage; `prescriptions` bucket PRIVATE with signed URLs. (Hosted RLS/privacy metadata verified, composed policies tested; live two-account Storage/CDN tests remain a device step.)
- [x] 3.2 Only the 2 allowlisted doctor emails can sign in; disable public signups (dashboard steps in docs/DEPLOY.md for the human). (Two verified allowed mappings and disabled hosted signup confirmed. Active membership also gates Storage.)
- [x] 3.3 Rate-limit login; security headers; audit log table (who viewed/edited what). Implemented with shared counters, primary-record audit events and transactional write auditing; coverage limits are in docs/SECURITY_REVIEW.md.
- [ ] 3.4 Backups: scripts/backup.sh (pg_dump) + weekly export docs. Supabase free tier pauses on inactivity -> document keep-alive. Tooling, encryption checks and docs/BACKUPS.md are complete. Full backup/isolated restore pending owner-held secrets, PostgreSQL tools and recovery target.
- [x] 3.5 Security + privacy review -> docs/SECURITY_REVIEW.md. Current source/live-metadata review completed in this Codex pass. The original Astra label was a model-routing preference; independent Claude critique remains the next review.
## Phase 4 - Deploy (HUMAN steps flagged)
- [x] 4.1 docs/DEPLOY.md: exact Vercel + Supabase env vars and CLI release runbook. Deployment authorized and performed through the existing Vercel project.
- [x] 4.2 scripts/smoke-test.mjs against deployed URL; docs/PARENTS_QUICKSTART.md in plain language. Real signed-in/device acceptance checks remain explicit.
## Phase 5 - Optional, only after parents have used it for a week
- [ ] 5.1 Photo of handwritten Rx -> OCR -> editable prefilled form. Decide OCR provider + patient-data consent first; never auto-save without doctor review.
- [ ] 5.2 PWA install + offline-tolerant drafts for iPad.

## Requested workflow updates — November 7
- [x] Reduce repeated doctor queries, patient/history payloads, blocking PDF initialization and save round trips. Add bounded patient selection, loading feedback and Mumbai function placement.
- [x] Add a searchable Ayurvedic medicine catalog and system filter. Apply additive migrations and seed the live database idempotently.
- [x] Add private, editable handwritten prescription notes with drawing, paper-photo attachment, draft support and A4/A5 printing. Verify ownership, concurrency, TypeScript and production build.

## V2 — N0 audit and confirmed defects
- [x] N0 audit: record all twelve requested areas before code changes in docs/V2_AUDIT.md.
- [x] N0.1 Reserve measured sticky-action-bar height plus safe area in the scroll container.
- [x] N0.2 Explain disabled Save controls using shared validation state.
- [x] N0.3 Default to both systems, optional touch filters and Allopathy/AYUSH result badges.
- [x] N0.4 Correct custom fields, persist manufacturer/composition, prevent normalized duplicates, and show existing-match feedback. Additive migration applied; 267 catalog rows preserved.
- [x] N0.5 Remove legacy GET patient searches and URL-producing consumers; redact clinical-data action errors. Ownership regression checks pass.
- [x] N0.6 Pin compact patient name/age/sex/allergy context in the prescription builder.
- [ ] N0 device acceptance: rendered checks at 768/820/1024/1180/1366px, Safari keyboard/touch/focus and signed-in flows. Browser integration unavailable; see BLOCKERS.md. Automated checks and source inspection are complete.

N1 is implemented on v2/brand-catalog; doctor/device acceptance is pending. N2–N7 remain unstarted; see docs/N1_REPORT.md.

## V2 — N1 brand catalog
- [x] N1 preparation: source investigation, ignored local input directory, structural file preflight and synthetic tests. See docs/N1_CHECKPOINT.md.
- [x] N1 source choice: owner selected NRCeS Common Drug Codes Flat Files.
- [x] N1 package input: supplied ZIP and License.txt inspected; actual linked TSV loader and 200-row tests complete. See docs/IMPORT_REPORT.md.
- [x] N1 license review: owner confirmed applicable Affiliate License.
- [ ] N1 doctor acceptance: supply the actual top-100 brands and check forms/strengths, favorites/defaults on iPad.
- [x] N1 implementation: brand/composition/preferences schema, additive migration, real import and zero-insert rerun, ranked search, usage learning, picker, coverage command and scale tests. See docs/N1_REPORT.md.
- [ ] N2 prescription-builder prompt: start after the N1 review checkpoint and dependencies are resolved.
