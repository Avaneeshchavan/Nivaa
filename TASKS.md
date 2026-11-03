# Nivaa TASKS (do in order; tick when verified)
## Phase 0 - Setup (Luna, low)
- [x] 0.1 `git init` INSIDE Nivaa root, .gitignore (.env*, node_modules, .next), initial commit. Delete orphan `clinic-app/`. Done when `git status` clean and build passes.
- [ ] 0.2 Write docs/STATUS.md summarizing repo vs Claude_Context_State.md; list anything that differs.
## Phase 1 - Blockers (Sol, medium)
- [x] 1.1 middleware.ts: protect /patients, /prescriptions, /settings, /templates (all non-login routes). Test: logged-out request to /settings redirects to /login.
- [x] 1.2 app/page.tsx: redirect to /patients (or /login if no session).
- [x] 1.3 Sidebar: fix /templates 404 (create a /templates page reusing the settings template manager OR repoint).
- [x] 1.4 Patient history "View Rx": link to /api/prescriptions/[id]/pdf (target _blank); handle visits with no Rx.
- [x] 1.5 MedicineAutocomplete: allow adding a custom medicine when no match; persist it to Medicine table.
- [x] 1.6 prisma/seed.ts: 150+ common Indian generic/brand medicines (antibiotics, analgesics, antipyretics, antihypertensives, antidiabetics, antacids, antihistamines, cough/cold, vitamins) with strength+form. Add `prisma db seed` config. List any entry you're unsure of in docs/MED_REVIEW.md for the doctor to verify (do not guess dosages). (Seed code verified; live seed and HTTP check pending database access; see docs/DB_NOTES.md.)
- [x] 1.7 package.json "postinstall": "prisma generate". Switch from `db push` to tracked migrations (`prisma migrate dev --name init`). (Baseline tracked; remote resolve pending database access; see docs/DB_NOTES.md.)
- [x] 1.8 Fix StoreInitializer props (clinicName, logoUrl); merge store/ into stores/.
## Phase 2 - Doctor-workflow features (Sol, medium)
- [x] 2.1 Rx history: re-open a past Rx, "Duplicate as new Rx" (big time saver for repeat patients).
- [x] 2.2 Patient search: add phone, diagnosis, medicine search; pg_trgm; duplicate-patient warning (similar name + same phone). (Local SQL verified; authenticated HTTP timing pending; see docs/SEARCH_NOTES.md.)
- [x] 2.3 Visit fields: weight, vitals (BP, temp, SpO2), allergies banner on patient header + Rx builder. (Migration verified locally; hosted DB deployment pending; see docs/DB_NOTES.md.)
- [x] 2.4 Template quick-bar in Rx builder: one-tap templates, editable after fill.
- [x] 2.5 PDF: letterhead/logo, Rx number, date, signature image upload, A4 and A5; Devanagari/Marathi text if used.
- [ ] 2.6 Speed: Cmd/Ctrl+K patient search, Enter to add medicine, autosave drafts.
## Phase 3 - Security & ops (Sol medium; Astra high ONCE for review)
- [ ] 3.1 Supabase RLS on all tables + storage; `prescriptions` bucket PRIVATE with signed URLs.
- [ ] 3.2 Only the 2 allowlisted doctor emails can sign in; disable public signups (dashboard steps in docs/DEPLOY.md for the human).
- [ ] 3.3 Rate-limit login; security headers; audit log table (who viewed/edited what).
- [ ] 3.4 Backups: scripts/backup.sh (pg_dump) + weekly export docs. Supabase free tier pauses on inactivity -> document keep-alive.
- [ ] 3.5 ASTRA REVIEW (one thread): security + privacy review -> docs/SECURITY_REVIEW.md, fix criticals only.
## Phase 4 - Deploy (HUMAN steps flagged)
- [ ] 4.1 docs/DEPLOY.md: exact Vercel + Supabase env vars and click-path. HUMAN performs deploy.
- [ ] 4.2 Smoke-test script against deployed URL; docs/PARENTS_QUICKSTART.md (1 page, plain language).
## Phase 5 - Optional, only after parents have used it for a week
- [ ] 5.1 Photo of handwritten Rx -> OCR -> editable prefilled form. Decide OCR provider + patient-data consent first; never auto-save without doctor review.
- [ ] 5.2 PWA install + offline-tolerant drafts for iPad.
