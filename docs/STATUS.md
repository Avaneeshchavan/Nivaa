# Nivaa current status — November 7, 2026

Current source is on `codex/template-polish-security-handoff`. The preceding production feature release was `eb19cbb` on `codex/faster-workflows-notes`. Production now runs application release `96391d0`, deployment `dpl_6sbFwax3bPRnXR6bkKRqRhiMskfY`. The final verification record is in `CLAUDE_HANDOFF.md`.

## Implemented workflows

- Two-doctor admission with verified Supabase identity, matching active Doctor row, deny-by-default middleware and ownership checks on application data.
- Patient registration/editing, bounded directory/search, duplicate warnings, history, allergies and visit measurements.
- Prescriptions with editable medicines, custom entry, Ayurvedic/allopathic filtering, reusable templates, duplication, optional print preview, saved notes and cloud drafts.
- A4/A5 PDF generation, letterhead, private signature, Devanagari font support, private archived PDFs with 60-second signed access and an authenticated fallback.
- Handwritten vector notes and private paper-note photos, including later edits with optimistic locking and additional printable pages.
- Query/payload reductions, concurrent builder loading, selected-patient summaries, three-connection runtime pools and Mumbai deployment.
- Template editor with padded responsive panel, scrolling content, fixed actions, full medicine names, inline medicine-detail editing, shared medicine picker, save/error feedback and duplicate-save protection.
- Server validation, verified database TLS, shared rate limits, security headers, private append-only audit records and Storage doctor-membership checks.

## Hosted evidence

Twelve migrations are applied. Both active doctor mappings match confirmed allowed Auth identities. Signup is disabled. The original seven application tables and the new AuditLog/RateLimit tables have RLS and deny direct browser access. Prescriptions, prescription-notes and signatures are private. Logos holds public branding. Catalog counts are 202 allopathic and 65 Ayurvedic presentations. A metadata integrity check found zero cross-doctor Visit/Patient mismatches.

A live Prisma transaction verified TLS connectivity, the template advisory-lock operation and atomic patient/audit rollback using synthetic fixtures. The transaction was rolled back and no fixture rows persisted.

## Automated verification

TypeScript strict checking, production builds and regressions cover admission, ownership, draft compatibility, notes, concurrent edits, private Storage, disabled doctors, query payloads, shared throttles, audit immutability, template idempotency, bounded inputs and backup encryption. Public deployment smoke checks cover login, protected routes, search POSTs and security headers. See the handoff for final run results and scope.

## Open conditions

The full encrypted backup/restore drill, authenticated browser timing, real-account Storage/CDN flows and physical iPad/Pencil/printing checks remain pending. Remaining dependency advisories and privilege-separation work are listed in SECURITY_REVIEW.md. Optional OCR and offline/PWA work are deferred. A successful build establishes compilation, while these device/operations checks require separate evidence.
