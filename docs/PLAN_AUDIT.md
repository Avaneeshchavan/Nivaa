# Nivaa plan audit — November 7, 2026

The project is substantially implemented and deployed. The remaining operational and device checks below prevent an unqualified statement that every item is complete.

## Planning sources

- `AGENTS.md` is the current repository instruction file. It requires reading installed Next.js guides. This installation of Next 15.5.28 has no `node_modules/next/dist/docs/` directory, so the relevant official version-15 data-security, caching and header guides were consulted.
- `TASKS.md` is the current product checklist.
- The supplied `00_MASTER_PLAN.md` lives outside this checkout. Its Nivaa goals are setup, blocker fixes, medicine seeding, security, Vercel deployment and parent testing. Its other projects and personal planning are outside this clinic review.
- `Claude_Context_State.md` and `Claude_Context_State1.md` were identical historical November 2 snapshots before this pass. They describe an older implementation. Their historical content is preserved with a notice pointing at current status and handoff files.

## Checklist comparison

| Tasks | Result | Evidence or remaining condition |
| --- | --- | --- |
| 0.1–0.2 | Complete | Correct local repository, ignored credentials/build output, orphan removed, current status updated. |
| 1.1–1.4 | Complete | Deny-by-default middleware, root redirects, working templates route, owned history PDF links and disabled No Rx state. |
| 1.5–1.8 | Complete | Custom medicines, 202 allopathic + 65 Ayurvedic catalog entries, tracked/applied migrations, Prisma postinstall and consolidated stores. |
| 2.1 | Complete | Duplicate owned Rx into a new visit with current date and editable clinical fields. |
| 2.2 | Implementation complete | Indexed name/phone/diagnosis/medicine search and duplicate warning exist. Signed-in HTTP p95 under 300 ms remains unmeasured. |
| 2.3–2.6 | Complete in source and automated checks | Measurements/allergies, templates, PDF branding/A4/A5/Marathi font, keyboard search and cloud drafts. Physical iPad/Pencil and printer checks remain pending. |
| 3.1 | Implemented and hosted metadata verified | Nine application tables are server-only/RLS protected. Three medical/signature buckets are private. Restrictive owner/membership policies are tracked and tested. Direct Storage/CDN tests with both real sessions remain pending. |
| 3.2 | Implemented and hosted configuration verified | Exactly two approved, confirmed identity mappings. Public signup disabled. Active doctor checks added. Real-account password/session tests remain a device check. |
| 3.3 | Implemented | Shared database login/PDF/upload limits, browser security headers, bounded validation and private append-only audit table for primary record operations. Audit coverage limits are listed in the security review. |
| 3.4 | Partial | Encrypted database + Storage export tooling and restore runbook exist. Full backup and isolated restore drill require owner-held secrets, PostgreSQL client tools and a recovery destination. This task remains unchecked. |
| 3.5 | Review completed | Current source/live-metadata/dependency review recorded in SECURITY_REVIEW.md. Historical model-routing labels are planning context. Independent Claude critique is the next external review. |
| 4.1 | Deployed | Existing Nivaa Vercel project, five app variables, Node 22, explicit Next preset and Mumbai functions. CLI runbook updated. |
| 4.2 | Implemented | Deployment smoke script and parents' quickstart exist. Fifteen production smoke checks and a denied synthetic sign-in passed. Results are recorded in CLAUDE_HANDOFF.md. |
| 5.1 | Deferred optional work | OCR requires a provider decision, consent and clinical review. Paper-note attachment and freehand drawing already exist. |
| 5.2 | Deferred optional work | PWA/offline drafts follow parent testing. Current drafts need a network connection. |

## Original Claude defects

All original six launch blockers have source fixes. The starter page is replaced, middleware protects all non-public routes, Templates exists, View Rx is linked, the catalog is populated/custom entry works, and Prisma generates during installation. Store naming and initializer props are corrected. Migrations and private PDF delivery are deployed. Repeat default-template loading is now idempotent and preserves edits.

The Supabase type file describes no browser-accessible application tables because those tables intentionally have server-only access through Prisma. It is not a missing patient CRUD implementation.

## Work still requiring external evidence or owner inputs

1. Complete and record a full encrypted backup and isolated restoration, including private photos, signatures, Auth identity reconciliation and Storage ownership.
2. Run the signed-in UI checklist on an iPad in both orientations with the virtual keyboard and a physical Pencil, then verify actual printouts and signed-link expiry.
3. Measure authenticated workflow/search latency with realistic synthetic clinic data and both doctor accounts. The local build's JavaScript sizes are not a substitute for that measurement.
4. Have the clinic doctors approve the inherited disease templates and actual medicine presentations. Their prescribing text has no clinical validation certification.
5. Review the remaining dependency advisories, runtime database privilege separation, Supabase administrator MFA and operational availability/retention choices.

These are recorded as pending conditions instead of silently checking every task.
