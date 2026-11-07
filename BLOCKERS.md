# Remaining verification and operations gaps

## Resolved migration-client certificate issue

The runtime driver connects successfully with verified TLS 1.3 and the official Supabase CA. Three Prisma migration-status checks using strict TLS failed with `P1011: The certificate was not trusted` or `Schema engine error` despite the same public CA. Tried the CA URL argument, native trust environment, and Node extra CA configuration. Resolved with `scripts/migrate-verified.mjs`. It exposes a temporary loopback listener to the native CLI and verifies the external server certificate and hostname before forwarding any startup/authentication data. Runtime and seed connections verify TLS directly. No database reset or external TLS verification bypass was used.

## Full backup and restore drill

The backup script and encryption/tamper checks are implemented. This machine has no `pg_dump` or `pg_restore` on PATH. A full backup also needs a locally supplied `SUPABASE_SERVICE_ROLE_KEY` to export private Storage objects, an owner-held `NIVAA_BACKUP_PASSPHRASE`, and an isolated restore destination. Those inputs are not available in the configured five application variables. No full clinic backup or live-data restore drill has been claimed.

## Browser and device verification

The browser integration lists the signed-in Nivaa tab but attaching fails with `browser.user is unavailable`. Native access to the Codex app is explicitly denied. TypeScript, production builds and synthetic service/SQL tests remain available. Signed-in visual checks, iPad virtual-keyboard behavior, physical Pencil input and authenticated latency measurement remain pending device verification.

## V2 N0 rendered acceptance — November 7

N0's six fixes, TypeScript/build, 16 regression suites and local HTTP checks are
complete. Reattempting the existing signed-in tab and the documented alternative
browser binding both failed with `browser.user is unavailable`. No rendered
viewport checks or screenshots could be obtained. The 768/820/1024/1180/1366px
review in docs/V2_AUDIT.md is explicitly source arithmetic, not browser evidence.
Safari virtual-keyboard/focus, real touch/Pencil and signed-in HTTP timing remain
unverified. No auth bypass or substitute browser-control mechanism was used.

## V2 N2 rendered workflow/performance acceptance — November 7

N2 implementation, synthetic workflow/draft/SQL/PDF tests and development-only timing instrumentation are complete. Attaching the existing signed-in browser tab again returned `browser.user is unavailable`. Consequently no actual React Profiler capture, authenticated save latency, timed four-medicine iPad run, Safari touch drag, keyboard-overlay/zoom inspection or physical print acceptance can be claimed. Reproduction steps and narrower Node core measurements are in docs/PERF_BUDGET.md. No auth bypass, new dependency or substitute browser-control mechanism was used. Review N2 before proceeding to N3.
