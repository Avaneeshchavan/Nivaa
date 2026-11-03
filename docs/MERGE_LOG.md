# Integration merge log

Date: 2026-11-03

## Merge order and ancestry

The completed branches form a linear stack from `main` (`061db5e`), so the merge order follows each branch's base and first-parent history:

1. `task/phase1a` — based on `main`; adds Phase 1.1–1.4.
2. `task/phase1b` — includes `task/phase1a`; adds Phase 1.5–1.8.
3. `task/phase2a` — includes `task/phase1b`; adds Phase 2.1–2.3.
4. `codex/security-review` — includes `task/phase2a`; adds the security review and fixes.
5. `task/2.4` — includes `codex/security-review`; adds the prescription template quick bar.
6. `task/2.5` — includes `task/2.4`; adds letterhead, signatures, and print sizes.
7. `task/2.6` — includes `task/2.5`; adds search shortcuts and draft autosave.
8. `task/3.1` — includes `task/2.6`; adds private Storage policies and signed PDF delivery.
9. `task/3.2` — includes `task/3.1`; adds the doctor allowlist.

Every branch's `git merge-base main <branch>` was `061db5e`, and each later branch's log contained the preceding branch tip. `integration` was created at the complete `task/3.2` tip (`e94ee3c`); each requested branch was then checked in the order above and was already included. The history required only fast-forwards.

## Conflicts and preservation

There were no merge conflicts, so no content from either branch side was discarded or manually chosen between. The source branch commits are all retained in `integration` ancestry.

The pre-existing worktree edit checking off TASKS item 0.2 and the untracked `docs/STATUS.md` were preserved unchanged while creating `integration`. They are local worktree changes, not branch commits.

## Verification

- `npx tsc --noEmit` — passed.
- `npm run build` — passed; Next.js 15.5.28 compiled all routes, including `/templates`.
- `node scripts/check-auth-redirect.mjs` — passed against the local production server; all eight unauthenticated paths redirected to `/login`.
- `node scripts/check-doctor-access.cjs` — passed; only the two allowlisted identities are admitted and malformed or absent configuration is denied.
- `node scripts/check-database-isolation.mjs` — passed; public API roles were denied access to application tables and restrictive RLS remained effective.
- `node scripts/check-pdf-security.cjs` — passed; anonymous and cross-owner access were rejected and PDFs used private delivery.
- `node scripts/check-prescription-storage.mjs` and `node scripts/check-storage-config.mjs` — passed; private bucket, owner access, and migration policy checks passed.
