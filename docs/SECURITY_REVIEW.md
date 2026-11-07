# Nivaa security review — November 7, 2026

This is the current review. The November 3 review is retained below as historical evidence with its original line references. Base-review references point at `codex/template-polish-security-handoff`. The N0 follow-up below records the limited changes on `v2/audit-fixes`; it is not a new full security certification.

Scope includes first-party actions, routes, middleware, data-bearing components/stores, validation, database schema/migrations, Storage policies, credentials/configuration, backup/deployment scripts and the dependency lockfile. Generated code and external packages are assessed through configuration, targeted source inspection and advisories rather than a complete third-party source audit. No security certification or clinical validation is implied.

## Current result

No unresolved Critical application finding was identified in this source and metadata review. High operational/privilege/dependency gaps remain below. The runtime now establishes certificate-verified TLS to Supabase. The security migrations are applied. Browser/device and full-recovery evidence remain limited.

Live checks confirmed two approved, confirmed Auth/Doctor mappings, disabled public signup, nine server-only/RLS-protected application tables, private prescriptions/note/signature buckets, active-doctor membership policies and zero cross-doctor Visit/Patient mismatches. A live Prisma test exercised verified TLS, the template advisory lock and atomic patient/audit rollback with synthetic rows. No synthetic rows persisted and no patient clinical content was exported for this review.

## V2 N0 follow-up

N0 audited the requested workflows and implemented the six scoped fixes; see
[the full audit](V2_AUDIT.md). Unexpected database/SDK errors are sanitized across
patient, Rx, draft, template and handwritten-note actions. Tests inject synthetic
private values into 20 actual action exports and verify safe messages, no original
cause, no private stack content and no console emission. Existing cross-doctor,
PDF and Storage isolation tests still pass. Prisma uses explicit empty logging
and minimal error formatting. Auth, middleware, RLS and all security migrations
are unchanged. The sole new migration adds medicine manufacturer metadata and a
pure text-normalization function/index; it changes no access policy or patient data.

H1/H2/H3 and provider/retention/device follow-ups remain open. No backup restore,
plan upgrade, privilege reduction, external log-retention verification or new
clinical validation was performed in N0.

## V2 N1 targeted checks

The owner confirmed an applicable source license. Five new catalog/preferences
tables extend server-only RLS/revoked browser access; existing security migrations,
auth and middleware remain unchanged. Search/learning/favorite actions derive
Doctor identity from getCurrentDoctor; all preference joins/writes bind that ID.
Search returns private no-store responses, and API failures contain fixed errors.
SQL values are bound parameters. New catalog functions use invoker permissions,
not SECURITY DEFINER. Source data is a shared catalog; preferences stay private.

Tests cover new-table denial, cross-doctor preferences, malformed input, duplicate
creation/rollback and raw-error redaction, alongside existing patient/PDF/Storage
checks. Hosted metadata verified RLS/SELECT denial on all five tables. No broad
API grants or old security-policy changes were introduced. Runtime remains the
existing administrative role (H2); backup/restore and prior operational findings
remain open. This is a scoped N1 review, not a fresh full-repository certification.

## Findings ranked by current severity

| ID / severity | Evidence and impact | Concrete follow-up |
| --- | --- | --- |
| H1 — High, open | `scripts/backup.mjs:24`, `docs/BACKUPS.md`. Full encrypted database/Storage export and isolated restore have not been run for the clinic. `pg_dump`/`pg_restore`, local Storage credentials, an owner-held passphrase and a recovery destination are unavailable. A crypto round-trip is narrower evidence than recovery of medical records and photos. | Complete the owner setup and isolated restore drill in BACKUPS.md. Verify Auth UUID/Storage owner reconciliation, maintain an off-device encrypted copy, and choose a recovery window and schedule. Keep task 3.4 unchecked until evidence exists. |
| H2 — High, open | `lib/prisma.ts:7` uses the configured trusted database login. It is currently the administrative connection used for migrations. Application-table RLS intentionally denies browser roles while this trusted connection bypasses those policies. An application-server compromise would therefore have a broad database impact and could alter safeguards. | Provision and test a dedicated runtime role with minimum DML grants and appropriate server-role policies, retain a separate migration administrator, then rotate the runtime variable. Re-test ownership, audit immutability, migrations and backups. This role/secret change needs a separate controlled rollout. |
| H3 — High, maintenance open | `package.json:29`, `package-lock.json`. After targeted patches, `npm audit --omit=dev` reports 29 affected package entries — 17 High, 10 Moderate, 2 Low, 0 Critical. Direct runtime Zod is patched. Remaining chains include Prisma/shadcn CLI/build dependencies and Next's PostCSS chain. An advisory count is not a count of reachable patient-data exploits. | Triage remaining paths with `npm explain` and upstream advisories, separate build tools from deployment runtime where safe, update compatible packages in a scoped branch, and rerun clean-install/build/runtime checks. Avoid an unreviewed major-version audit-fix sweep. |
| M1 — Medium, recovery/availability | `docs/BACKUPS.md`, `scripts/check-availability.mjs:1`. The clinic uses free-tier infrastructure. Pause/usage alerts, backup scheduling and a tested downtime/reconciliation procedure are operational choices outside the source. | Verify owner alert recipients, run the non-patient-data availability check from a trusted machine, document resume/reconciliation ownership and decide the required hosting availability. |
| M2 — Medium, audit coverage | `lib/security/audit.ts:4`, `actions/drafts.actions.ts:21`, `actions/patients.actions.ts:12`, `app/api/handwriting/[id]/route.ts:8`. Primary full-record views, saved record/profile/template writes, Rx copy/notes, PDF generation and successful uploads are audited. Directory results, draft autosaves, direct Storage reads and failed attempts do not all create application audit events. Audit rows contain actor/resource IDs and remain sensitive metadata. | Agree on the clinic's required audit coverage and retention. Add endpoint or platform events for the missing operations without logging searches or clinical text. Monitor append-only log growth and export logs under the backup policy. |
| M3 — Medium, upload hardening | `actions/handwriting.actions.ts:18`, `actions/signature.actions.ts:11`, `components/settings/SettingsView.tsx:96`. File size, MIME/magic checks, private paths, bucket restrictions and upload quotas exist. Server-side image validation does not fully decode images or cap decoded pixel dimensions. Photo resizing/metadata removal occurs in the normal browser flow. | Add a reviewed server image-decoding/re-encoding boundary with pixel and byte limits before accepting images, including branding/signatures. Test malformed/truncated/oversized images and keep decoder advisories current. |
| M4 — Medium, application remediated; platform retention open | N0 removes GET exports from `app/api/patients/route.ts:8` and `app/api/patients/duplicates/route.ts:8`, removes SearchInput's URL fallback, stops page-query consumption and changes the benchmark to POST. Current clients use bounded POST JSON. `lib/security/action-error.ts:10` also drops unexpected clinical-data exception details before framework logging. | Review historical access logs/browser history, platform body capture/log drains and retention. Previously recorded searches cannot be removed by a source change. Signed-in HTTP/device acceptance is still pending. |
| M5 — Medium, browser defence/acceptance | `next.config.ts:3`. CSP enforces same-origin framing restrictions and limits asset/network destinations, but permits inline Next bootstrap scripts/styles. Blob PDF support is allowed. Signed-in browser/CSP/PDF compatibility could not be exercised through the unavailable browser integration. | Verify the whole signed-in flow and printing on Safari/iPad. Assess nonce-based CSP in a focused change and check its rendering/caching effects. Review session expiry, administrator MFA and iPad lock/download policies. |
| M6 — Medium, clinical revision integrity | `actions/handwriting.actions.ts:54`, `lib/templates/defaultTemplates.ts:19`. Saved advice/handwriting edits use ownership checks, optimistic locking and an audit event, but the clinical body is replaced rather than retained as a full revision. Final create actions also lack client request IDs, so a retry after a lost success response can create a duplicate record. Inherited sample templates contain prescribing text that has not been clinically validated by this review. | Decide with the doctors whether signed prescriptions need immutable versions/addenda. Add and test request idempotency for final saves after response loss. Have the doctors review every inherited pack and actual catalog presentation before use. Clinical dosing correctness needs clinical review. |
| M7 — Medium, provider configuration | `lib/database-connection.ts:4`, `prisma.config.ts:7`. Application, seed, backup and migration-helper connections now enforce verified external TLS. The provider previously accepted an unencrypted client connection, so clients outside this code can still require a provider-side safeguard. | Supabase owner opens Database settings → SSL Configuration and enables SSL enforcement during an agreed maintenance window, then re-tests clients. Confirm account MFA and project-level logging/preview controls. Dashboard access/settings were not available through the browser integration. |

Supabase database backups cover database metadata, while Storage object bytes require their own export. Free projects may pause after low activity over seven days. These operational conditions are documented in the owner runbook. [Backup scope](https://supabase.com/docs/guides/platform/backups), [production checklist](https://supabase.com/docs/guides/deployment/going-into-prod)

## Remediations completed in this pass

| Finding addressed | Current source / result |
| --- | --- |
| High — runtime database connection lacked verified TLS | `lib/database-connection.ts:4`, `lib/prisma.ts:7`, `prisma/seed.ts:24`. Remote connections strip weakening SSL URL flags, require certificate/hostname validation, and trust the official public Supabase CA. Live Node/Prisma connections verified encrypted/authorized TLS. Function traces include the CA file. |
| High — shared abuse budgets absent | `lib/security/rate-limit.ts:4`, `actions/auth.actions.ts:42`, PDF route `:39`, upload actions. Atomic PostgreSQL counters span Vercel instances. Login allows 10 attempts per approved address per 10 minutes, PDF generation 60 per doctor per minute, and note/signature uploads share 30 per doctor per 10 minutes. Provider Auth limits still need owner review because direct Supabase requests do not pass through app limits. |
| High — private Storage admission depended only on object ownership | `prisma/migrations/202611070004_storage_membership/migration.sql:1`, `actions/auth.actions.ts:29`. Storage now also requires an active Doctor whose confirmed Auth UUID/email mapping matches and whose account is not banned. The SECURITY DEFINER function has a fixed search path, no parameters, no PUBLIC execution and returns only a boolean. Existing UUID/owner guards remain. Disable Doctor.active for immediate membership revocation. Signed PDF URLs retain their maximum 60-second bearer lifetime. |
| Medium — missing audit/hardening | `prisma/schema.prisma:137`, `lib/security/audit.ts:9`, `next.config.ts:19`. Private audit table, immutable update/delete/truncate trigger, transactional primary writes, CSP/frame protection/nosniff/no-referrer/HSTS and permissions policy added. Read-audit failures fail closed on covered records. Logout remains available if logout auditing fails. |
| Medium — template/profile/patient/item validation | `lib/validations/template.schema.ts:4`, `profile.schema.ts:3`, `patient.schema.ts:3`, `prescription.schema.ts:5`. Bounded strings/collections, valid dates and approved logo destinations are checked server-side. Template update/delete predicates include doctorId. Nested visit/Rx reads filter doctor/patient ownership. |
| Medium — duplicate default seeding and accidental cross-patient reuse | `actions/templates.actions.ts:64`, `stores/rxBuilderStore.ts:55`. Default loading serializes per doctor and preserves existing/edited templates. Choosing a different patient clears prior clinical entries, with a confirmation in the builder when entries exist. |
| High/Critical advisory package entries | `package.json`, `package-lock.json`. Root Zod moved to 4.6.7 within its existing major range. A compatible proxy-addr 2.0.8 override removes the Critical CLI-chain advisory. Only two installed packages changed. The direct runtime Zod advisory and Critical package entry are cleared; the remaining audit is not clean. |

The Zod advisory concerns oversized collection validation. The proxy-addr issue concerns a trusted-proxy IP parsing path in Express, reached here through CLI tooling rather than an application Express server. [Zod advisory](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5), [proxy-addr maintainer advisory](https://github.com/jshttp/proxy-addr/security/advisories/GHSA-jqcg-44mw-7w3h)

## Authorization and data paths

- Middleware checks a verified allowed Supabase identity on every non-public route. Each Server Action/route independently checks the active Doctor mapping. The public auth route exception currently has no handlers.
- Patient list/search/duplicates use doctor-scoped, parameterized reads. Full patient/edit reads audit the owned object. Patient writes derive doctorId and commit the saved mutation plus audit together.
- Prescription creation checks the owned patient and atomically creates Visit/Rx/audit. Duplication, notes and PDFs scope the Rx and patient doctor. The PDF route validates visit consistency before rendering and never returns a public bucket URL.
- Templates scope all data to the doctor, validate medicines and constrain update/delete at the write. The shared medicine catalog intentionally has no patient or doctor owner and contains presentation data.
- Drafts are doctor-key scoped, payload bounded and patient ownership checked on reads/writes. They are online working state. Patient switches clear clinical entries.
- Note photos/signatures use the authenticated Supabase UUID folder. Three medical/signature buckets are private. Logos are public branding with owner/membership restrictions on writes. New medical note photos are immutable files. Detachment retains historical/unreferenced files for safe reference recovery.
- HTTP private routes use no-store responses where they carry medical content. Medicine presentation responses are privately cached. New search requests use small JSON bodies and generic errors. Platform body-logging/retention settings need owner confirmation.

## Evidence and limits

All relevant first-party entry points were reviewed. No actual credential was found by the current tracked-source scan. `.env`/`.env.local` remain ignored and unmodified by this pass. The tracked public CA contains a certificate, not a private key. Its SHA-256 fingerprint is `80:70:25:AD:50:D4:ED:21:9D:2C:9C:7D:29:9C:00:4F:82:4E:B0:0C:F7:F6:5A:FE:F6:07:D0:7B:72:E6:CA:FA`, valid through April 26, 2031, downloaded from Supabase's certificate distribution bucket. [Official Supabase SSL guidance](https://supabase.com/docs/guides/platform/ssl-enforcement)

Tests cover anonymous/foreign/mismatched records, drafts, concurrent note changes, switched patients, template ownership/idempotency, real SQL rate-limit atomicity, append-only audit guards, disabled/mismatched Storage identities, bounded requests, encryption authentication and overwrite protection. TypeScript strict checks and the production build pass. New migration/connection behavior was exercised against live metadata and a rolled-back synthetic Prisma transaction.

Browser automation could list the existing clinic tab but attaching failed with `browser.user is unavailable`. Native access to the Codex app is explicitly denied. No authenticated browser, physical iPad/Pencil, printer, full backup/restore, administrator MFA, live cross-doctor Storage/CDN or Vercel log-retention verification is claimed. The production release `96391d0` passed 15 anonymous/header checks and a denied synthetic sign-in with no session cookie. These checks are narrower than authenticated clinical workflow verification. Deployment details are recorded in the release handoff.

## Historical review

<details>
<summary>November 3 review and follow-up, preserved with original references</summary>

# Nivaa security review

Reviewed 2026-11-03, starting at `1fd4b36` on `codex/security-review`. Scope: all first-party routes, actions, components, stores, validation, schema/migrations, seed/scripts, configuration, documentation and dependency lockfile. Generated/build output and third-party library source are not a full dependency code audit. References below use **pre-fix lines at `1fd4b36`**, unless explicitly labelled remediation.

**Release decision: do not use real patient data until the Critical remediations are deployed and the dashboard checks below pass.** This is a source and local test review, not confirmation that a hosted project is secure or evidence of an actual breach.

Severity: Critical = potential bulk medical-data exposure/modification or server compromise; High = significant confidentiality, integrity or recovery gap; Medium = narrower exposure or missing defence. Deployment-dependent conditions are stated explicitly. No feature work or High/Medium remediation is included.

## Findings, ranked

### C1 — Critical: application tables have no database/API isolation

**Evidence:** `prisma/migrations/0_init/migration.sql:5`, `:22`, `:38`, `:51`, `:67`, `:79` create six tables in `public`; none of the three existing migrations enables RLS or restricts grants. `lib/supabase/client.ts:5` intentionally sends the public project key to browsers. `lib/prisma.ts:6` accesses Postgres directly.

**Impact/condition:** if these tables are in an exposed Supabase schema and `anon` or `authenticated` has grants, a caller can bypass Next.js and query/change medical records directly. Doctor-table writes could also compromise the server's identity mapping. This is a confirmed missing migration safeguard; live grants/exposure are **unverified**, not proven open. Supabase project defaults and manually configured policies can differ. A public key is not itself a secret. [Supabase API security](https://supabase.com/docs/guides/api/securing-your-api).

**Concrete fix:** since this app uses Prisma for all application data, enable RLS and explicitly deny direct API access to all six tables; revoke browser-role/PUBLIC privileges and add a restrictive deny policy so an existing permissive policy cannot reopen access. Protect Prisma migration metadata too. Retain server action ownership checks: the current administrative Prisma connection bypasses RLS. Disable the Data API in the dashboard if unused, or remove application tables from exposed schemas. Do not introduce broad `authenticated USING (true)` policies.

**Status:** fixed in tracked migration `prisma/migrations/202611030003_private_application_tables/migration.sql:1`; production application and metadata checks still pending working DB access. `node scripts/check-database-isolation.mjs` reproduces the original exposure and verifies SELECT/INSERT/UPDATE/DELETE/TRUNCATE denial on all seven tables, restrictive RLS despite a permissive policy/restored DML grants, and retained trusted-server access. This uses the already installed PGlite test engine and synthetic data.

### C2 — Critical: prescription PDFs are designed for public URLs

**Evidence:** `app/api/prescriptions/[id]/pdf/route.tsx:50` uploads to `prescriptions` at a deterministic doctor/Rx path; `:65` calls `getPublicUrl`; `:72` persists that public URL. No bucket/privacy policies are tracked. `:80` returns medical content without explicit `private, no-store` headers.

**Impact/condition:** if the bucket is public, anyone with an object URL can read a prescription without the app's ownership check. CUIDs are not an authorization boundary; guessing is not required if a link leaks. `getPublicUrl` does **not** prove the bucket is currently public. Private bucket state is unverified. Public bucket reads bypass object read policies. [Storage bucket security](https://supabase.com/docs/guides/storage/buckets/fundamentals).

**Concrete fix:** make the bucket private, constrain Storage reads/writes to the authenticated user's UUID folder and object owner (both `USING` and `WITH CHECK`, with a restrictive guard against old broad policies), stop generating/persisting public URLs, and continue serving through the authenticated PDF route with no-store headers. Filter the Rx query by doctor and validate related patient/visit ownership before rendering. No signed URL is needed for the existing direct-response workflow; any future sharing must authorize ownership first and use short-lived signed URLs. Old public links must be tested after privacy changes; account for previously cached/downloaded copies.

**Status:** fixed in `prisma/migrations/202611030004_private_prescription_storage/migration.sql:1` and the PDF handler. New files use Auth UUID folders with object-owner checks; old CUID folders are preserved but quarantined from API users (the authorized route can regenerate them). Public `pdfUrl` metadata is cleared and no public/signed bearer URL is generated. Storage still permits authenticated users to manage their own UUID folder; Doctor admission/abuse controls remain H1/H5. The bucket guard prevents browser roles changing this bucket to public. Local SQL tests cover anonymous and two-owner read/write isolation even with old broad policies, and the actual handler test covers anonymous, foreign doctor/patient/visit, no-store and upload-failure fallback. Dashboard privacy, cached copies and deployed two-doctor tests remain pending.

### C3 — Critical: installed Next.js/image processor has published RCE advisories

**Evidence:** `package.json:26` / `package-lock.json:9068` pin the installed Next.js to 15.5.18; `package-lock.json:10824` installs sharp 0.34.5. `middleware.ts:55` exempts the image optimizer and `next.config.ts:3` leaves defaults enabled. npm audit reports Next.js Critical findings, including [SVG image optimization RCE](https://github.com/vercel/next.js/security/advisories/GHSA-2464-fhr4-w9xw) (patched in 15.5.28 with sharp >=0.35.5).

**Impact/condition:** the SVG advisory affects glibc Linux image processing. Actual exploitability depends on hosting/runtime and attacker-controlled image input; no hostile-image exploit was run and this repo does not enable arbitrary remote image hosts. Other Critical advisories affect AVIF processing and Windows hosting (Windows does not match the stated Vercel deployment). Treat the installed vulnerable framework as a release blocker rather than assuming a platform mitigation.

**Concrete fix:** update the existing Next.js dependency to the patched 15.5.28 release and regenerate its lockfile dependency tree; confirm sharp >=0.35.5, run type/build/auth checks, redeploy all active environments. Do not run broad `npm audit fix --force` or upgrade unrelated packages.

**Status:** updated to Next.js 15.5.28 and its existing sharp dependency to 0.35.5. A Next-only install retained sharp 0.34.5; a targeted `npm update sharp` was needed. Only Next/sharp and their required/platform dependency trees changed; no new direct dependency. Final validation below.

### H1 — High: doctor admission depends only on a provisioned database row

**Evidence:** `actions/auth.actions.ts:7` accepts any verified user mapped by `supabaseId`; `middleware.ts:38` accepts any verified Auth user; `app/(auth)/login/page.tsx:43` directly uses password sign-in; `app/(dashboard)/layout.tsx:18` does not reject a missing doctor. No two-email allowlist, account provisioning runbook or MFA assurance check exists (`TASKS.md:23`).

**Impact:** an accidentally provisioned third Doctor can use the app; compromised doctor credentials expose that doctor's records. Signing up alone does **not** grant patient access: actions require a Doctor row and there is no public Doctor-create action. Dashboard signup/MFA settings were not verified.

**Fix:** disable public signup and unused providers, manually provision just the two verified identities, enforce a server-side allowlist and, if adopted, MFA assurance at the shared doctor gate. Audit existing Auth users/Doctor mappings and session revocation. Keep the per-action checks even with middleware. **Dashboard:** Authentication sign-in/signup settings, Users, rate limits/password protections; MFA for Supabase/Vercel administrators.

### H2 — High: patient-identifying queries enter URLs; errors are logged without redaction

**Evidence:** `components/patients/SearchInput.tsx:22` writes names/diagnoses/phone searches into browser history; `components/patients/PatientDirectory.tsx:31` sends them in query strings; `components/patients/PatientForm.tsx:62` sends name + phone in the duplicate-check URL. `middleware.ts:42` retains the query string on redirect to `/login`. `actions/auth.actions.ts:26`, `app/api/medicines/route.ts:34`, and PDF route `:62`, `:88` log raw exceptions.

**Impact:** sensitive strings can enter history, same-origin referrers, request/access logs and third-party log drains. Database/render/storage exceptions may include identifiers, paths or invalid field values; no actual hosted log contents were inspected. No explicit patient-row console logging, analytics SDK, or persistent Rx browser store was found.

**Fix:** send patient searches/duplicate checks in POST bodies or Server Actions; keep identifying search text out of URLs, remove query strings on login redirects, use `Referrer-Policy: no-referrer`, and log only safe event codes/correlation IDs. Redact request queries and exclude bodies/cookies/PDFs from Vercel and Supabase log drains; set restricted access and short retention. **Dashboard:** verify real logging/export configuration, not just application console calls.

### H3 — High: recovery is not implemented or rehearsed

**Evidence:** `TASKS.md:25` leaves backup work unchecked; `docs/DB_NOTES.md:22` says to take a backup but supplies no backup/restore process. No backup script, schedule, encrypted off-site destination, restore test, or recovery owner exists.

**Impact:** deletion, corruption, credential compromise or a lost project can permanently lose clinic records. Git contains code, not patient data. Free projects should keep their own exports; Supabase database backups do not include Storage object bytes. [Supabase backups](https://supabase.com/docs/guides/platform/backups).

**Fix:** define a recovery objective with the clinic (suggest daily encrypted database export, daily incremental object copy and a weekly retained snapshot), keep a separate restricted off-site copy, and alert on missed backups. Include app data, Auth identity mappings, policies/roles, migrations and Storage objects/configuration. Restore into a separate isolated project regularly, verify record counts and both doctors' login/PDF access, then document recovery steps and key custody. Never test restore over production. **Dashboard:** inspect actual backup entitlement/retention, consider paid backups/PITR, and ensure backup account MFA.

### H4 — High: runtime database connection uses an administrative role and does not enforce TLS in code

**Evidence:** `lib/prisma.ts:6` passes `DATABASE_URL` straight to `pg.Pool`; `.env.example:8` uses the `postgres` pooler identity without TLS parameters, as does `:11` for migrations. Local env inspection (values withheld) confirms postgres-prefixed usernames and no `sslmode`. No application `ssl` configuration exists.

**Impact:** an app/server credential compromise reaches all doctors and schema objects; owner/BYPASSRLS connections are not constrained by RLS. An unencrypted connection could expose credentials/medical records if the server allows it. Actual server TLS enforcement is unverified.

**Fix:** split migration credentials from runtime credentials; enforce verified TLS using the correct Supabase CA/hostname configuration and database SSL enforcement. Use a least-privileged server role with only required privileges and a deliberate RLS strategy; simply switching to a non-owner after C1 will deny all access. Do not disable certificate verification. Restrict network access where compatible with Vercel connectivity. **Dashboard:** database SSL enforcement, connection roles/password rotation and network restrictions; Vercel server-only env scopes.

### H5 — High: no application abuse limits on expensive authenticated operations

**Evidence:** `app/(auth)/login/page.tsx:43`, `actions/patients.actions.ts:8`, `actions/prescriptions.actions.ts:8`, `actions/templates.actions.ts:87`, PDF route `:33`. No request limiter exists. Template seed inserts repeatedly; PDF GET renders and uploads on every request. Debouncing is client UX, not a rate limit.

**Impact:** a compromised doctor account can consume database/compute/storage quotas or flood records. Auth has provider rate limits, so “login is completely unlimited” would be incorrect; their configured adequacy is unknown. [Supabase Auth rate limits](https://supabase.com/docs/guides/auth/rate-limits).

**Fix:** verify provider password/token limits and bot protections; enforce server-side doctor/IP limits and bounded concurrency on PDF/search/writes using a shared store suitable for Vercel instances, return 429, and make seeding idempotent. An in-process counter alone will not cover multiple instances. **Dashboard:** Auth limits and Vercel Firewall rules, plus quota/usage alerts. Vercel login-path rules alone cannot protect direct Supabase password requests.

### M1 — Medium: runtime validation is incomplete

**Evidence:** `actions/templates.actions.ts:18`, `:39` accept `medicines: any` without parsing; `actions/auth.actions.ts:37` accepts profile strings/URL without a runtime schema; `lib/validations/patient.schema.ts:4`, `:5`, `:13` lack name/address bounds and DOB validation; `lib/validations/prescription.schema.ts:7`–`:12` lacks several item-string limits. `components/settings/SettingsView.tsx:113` trusts filename extension/MIME and `:344` uses only client `accept="image/*"`.

**Impact:** malformed stored JSON can break the builder/PDF, excessive content can exhaust rendering, and arbitrary logo URLs can track clinic browsers. No confirmed stored HTML XSS was found (React text rendering escapes content). The PDF's optional remote Image at `components/prescriptions/RxPDFDocument.tsx:89` is currently not passed a logo URL by either caller, so a live SSRF route via profile logo is **not** demonstrated.

**Fix:** Zod-parse every action's untrusted arguments and bound strings/collections/dates. Allow only the clinic's approved HTTPS logo storage paths; validate real file bytes/size and enforce bucket MIME/size limits (PNG/JPEG). Before enabling server-rendered remote logos, prevent private-network fetches/redirects. Return safe validation messages. **Dashboard:** logos bucket file restrictions and owner-scoped insert/update/delete/select policies (doctor CUID folder is not `auth.uid()`; map deliberately or migrate paths). Logo policies are absent from the repo and unverified.

### M2 — Medium: relational ownership is assumed on nested reads

**Evidence:** `actions/patients.actions.ts:31`, `:51` include visits/prescriptions without nested doctor filters; pre-fix PDF query `:20` loads relations before checking prescription ownership at `:28`. `prisma/schema.prisma:69` and `:89` have independent doctor/patient/visit foreign keys, not constraints enforcing matching doctors. Patient/template updates/deletes check ownership first then mutate by ID (`actions/patients.actions.ts:87`, `:93`; `actions/templates.actions.ts:51`, `:56`, `:74`, `:79`).

**Impact:** no direct action-level IDOR was found with data created by current actions: writes derive doctorId server-side and verify patient ownership. However, cross-doctor rows introduced by manual import, a broad API grant or a future bug can leak through relation includes. Separate check/write also assumes records are never reassigned concurrently.

**Fix:** include doctorId in mutation predicates, scope nested relations, and add composite ownership constraints or equivalent transactional checks for imports. Validate prescription/patient/visit consistency before PDF rendering (included with C2 because it is the PDF boundary). Test adversarial IDs for two doctors and an Auth user without a Doctor row.

### M3 — Medium: browser/session hardening and read audit trail are missing

**Evidence:** `next.config.ts:3` has no security-header configuration; `actions/auth.actions.ts:31` only signs out and redirects; `components/dashboard/BottomNav.tsx:8` has no sign-out action while Sidebar is hidden on small screens (`components/dashboard/Sidebar.tsx:35`). `prisma/schema.prisma:15`–`:116` contains no audit model. The Rx store is memory-only and resets on unmount (`components/prescriptions/RxBuilder.tsx:57`), which is a positive control.

**Impact:** no application-defined frame-embedding protection/CSP or idle-lock workflow; someone using an unlocked shared iPad may access a live session or downloaded PDF. No attributable trail of record views/edits/PDF generation exists. Hosting headers, session expiry and managed-device settings were not inspected; a downloaded file cannot be revoked by logout.

**Fix:** add CSP compatible with the PDF blob viewer, `frame-ancestors`, `nosniff` and no-referrer headers; accessible sign-out/idle lock and clear sensitive state on logout. Verify expiry/revocation on the server. Record actor UUID, object ID, action, outcome and time in an append-only restricted audit log, never clinical text. **Dashboard/device:** session policies, administrator MFA, iPad passcode/auto-lock, browser downloads/printing policy.

### M4 — Medium: free-tier pausing is an unplanned clinic outage

**Evidence:** `TASKS.md:25` lists the issue but no operational runbook or alert is implemented; `docs/DB_NOTES.md:7` documents unavailable DB access. These connection failures do not prove the project is paused.

**Impact:** Supabase can pause Free projects after low activity over seven days; clinic holidays can interrupt logins and record access. A reachable Vercel homepage alone does not establish DB availability. [Current pausing policy](https://supabase.com/docs/guides/platform/free-project-pausing).

**Fix:** choose paid hosting for dependable clinic operation, or explicitly accept free-tier risk with owner email monitoring, daily non-PHI dependency checks and a resume procedure (Supabase project → Resume project), plus an offline contingency. A keep-alive is not an uptime guarantee or backup. **Dashboard:** inspect project status and billing plan, verify pause-warning recipient, resume if needed; no plan changes were made here.

### M5 — Medium: remaining dependency advisories need a scoped maintenance pass

**Evidence:** initial `npm audit --omit=dev` returned 31 affected package entries (2 Critical, 18 High, 9 Moderate, 2 Low). Counts include propagated/transitive findings, not 31 independently exploitable clinic flaws. `package-lock.json:10035` has proxy-addr 2.0.7 through shadcn → MCP SDK → Express; `:12370` has Zod 4.4.3. See [proxy-addr advisory](https://github.com/jshttp/proxy-addr/security/advisories/GHSA-jqcg-44mw-7w3h).

**Impact:** proxy-addr's upstream Critical rating requires an affected Express trusted-proxy configuration. No Express/MCP server or affected IP trust configuration is used by Nivaa's request handlers; it is a CLI dependency here, so no Critical application exploit is established. Other findings include collection-validation/resource exhaustion and build-tool vulnerabilities; reachability differs by package.

**Fix:** separately triage and upgrade runtime validation and build/CLI dependencies, remove unnecessary production tooling where appropriate, and add recurring lockfile review. This review fixes C3 only; no unrelated audit-fix sweep is authorized. Do not mistake a successful build for a clean security audit.

## Authorization and data-flow inventory

| Entry point | Verified source controls / residual issue |
|---|---|
| Middleware | `getUser()` verifies with Supabase; deny by default, only exact `/login`, `/api/auth` subtree and explicit static/Next assets bypass. `/api/auth` currently has no handlers. Backend controls remain required for Server Action calls, including calls posted to public routes. |
| getCurrentDoctor / profile | Verified Auth UUID → unique Doctor lookup; profile updates use that ID, explicitly select fields (cannot mass-assign id/supabaseId). Missing admission allowlist: H1. |
| Patient list/detail/duplicates | Every exported action authenticates; reads and parameterized SQL scope doctorId; search wildcards are escaped and results capped at 50. Nested-read caveat M2. |
| Patient create/update | Zod parsing strips unknown fields; doctorId supplied server-side; update checks ownership. M1/M2 remain. |
| Prescription create/duplicate | Owned patient required; new visit/Rx created atomically with current doctorId; duplicate scopes Rx and patient doctorId. No caller-supplied doctorId accepted. |
| Templates read/create/update/delete/seed | Every exported action requires doctor; reads/counts scope doctorId, writes derive it; update/delete precheck owner. Missing validation and repeat seeding: M1/H5. |
| Medicine API/custom action | Doctor required. Medicine intentionally has no doctorId: shared non-patient catalog. Custom input bounded, upsert preserves existing record. Do not put patient information in medicine names. |
| PDF route | Auth + prescription owner check precedes render/response; C2 fixes Storage/public delivery and strengthens relation checks. |
| Supabase browser access | Auth and logo upload only; no browser query of application tables. This supports C1's deny-all Data API policy without breaking ordinary Prisma data flows. |
| Env/secrets | `.env` and `.env.local` ignored; only placeholder `.env.example` tracked. Pattern scan found no real credential in tracked files; reachable history contains no other env path; a pattern scan of 144 reachable text blobs found no credential-pattern matches. No service-role key used in client code. This is not proof of absence in GitHub settings, old dangling objects, logs or external copies. Server-only DB credentials and separate preview/project env scopes must be verified in Vercel. |

## Dashboard / deployment actions for the owner

1. **Supabase Data API:** disable it if unused; otherwise verify exposed schemas and table privileges/RLS. Use Security Advisor. C1 migration is required even if current defaults happen to deny access. Do not grant direct application-table access to authenticated users to “fix” UI problems.
2. **Supabase Storage:** make `prescriptions` PRIVATE immediately if it exists; apply the C2 migration and inspect policies for both buckets. Keep logos public only if they contain branding alone. Inspect old public PDF links without credentials and as the other doctor; they must not return bytes. If anything was public, investigate access logs and cached copies, revoke outstanding signed links as supported by Storage, and assess exposure; no breach is asserted here.
3. **Database deployment:** repair connection configuration (API DNS failed; direct DB returned `XX000`), back up first, follow `docs/DB_NOTES.md` to baseline existing tables safely, then `npx prisma migrate deploy`. Do not reset or drop data. Prisma deploy must run with the migration/admin role; storage changes may require the Supabase SQL Editor's administrative context. If Storage does not exist in a local plain-Postgres environment, the guarded storage migration skips it; that is not evidence of production bucket protection.
4. **Auth/users:** disable public signup/unused providers; inspect the two allowed identities, password/rate-limit settings and administrator MFA. These High findings are not implemented in this change.
5. **Vercel:** redeploy the patched commit after migrations; confirm production and preview environments use the intended Supabase project, DB secrets are server-only, preview access is restricted, and logs do not export patient queries. Do not connect public preview branches to the real clinic DB by default.
6. **Operations:** verify backups and an isolated restore; monitor project status/pause emails, quotas and failed backups. A plan upgrade, dashboard settings, account provisioning, cached-object remediation and operational ownership require the project owner.

### Read-only production verification (SQL Editor)

```sql
SELECT c.relname, c.relrowsecurity,
       has_table_privilege('anon', c.oid, 'SELECT') AS anon_select,
       has_table_privilege('authenticated', c.oid, 'SELECT') AS authenticated_select
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('Doctor','Patient','Visit','Prescription','Medicine','DiseaseTemplate');
SELECT id, public FROM storage.buckets WHERE id IN ('prescriptions','logos');
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies WHERE schemaname IN ('public','storage');
```

Expected after fixes: all six application tables RLS-enabled and no browser SELECT privileges; prescriptions bucket `public = false`; restrictive application-table denial and owner-scoped Storage policies present. Also inspect write grants and test real Storage calls: metadata alone does not cover CDN behaviour. Use synthetic fixtures for logged-out, doctor A, doctor B and authenticated-but-unprovisioned-user tests; never print patient responses or credentials in test logs.

## Verification and limitations

- Initial secret scan and complete application data-access inventory completed; no patient records downloaded or modified.
- Live metadata-only API check could not resolve the configured hostname (`ENOTFOUND`); DB security metadata connection returned `XX000`. Policies, bucket state, Auth settings, grants, backup availability and Vercel settings therefore remain unverified.
- Local database-isolation, Storage-policy and actual PDF-handler regressions passed using synthetic fixtures. Typecheck/build and final dependency verification are recorded below after C3.
- npm audit succeeded after retrying outside the restricted network; no dependency changes made by the audit itself.
- Installed Next 15.5.18 has no `node_modules/next/dist/docs/` folder required by AGENTS; consulted [official Next.js 15 data-security guidance](https://nextjs.org/docs/15/app/guides/data-security) instead. Server Actions must authorize independently; hiding action IDs or relying on middleware is insufficient.
- Existing unstaged Phase 0 TASKS change and untracked `docs/STATUS.md` are preserved, not included in review commits.

### Final dependency results

After C3, `npm audit --omit=dev` reports 30 affected package entries: 1 upstream Critical (proxy-addr, CLI-only reachability described in M5), 17 High, 10 Moderate and 2 Low. Sharp has no reported advisory; Next is now marked Moderate through its bundled PostCSS, with no direct Next Critical advisory. High/Medium dependency findings remain intentionally unfixed. The audit is not clean.

The Next/sharp patch refresh also adds platform-specific optional packages to the lockfile; it adds no application capability or direct dependency. Reproduce with `npm ci` on the deployment platform and do not discard the lockfile.

### Final local checks

- `npx tsc --noEmit` — passed after the final dependency update.
- `npm run build` — passed on Next.js 15.5.28. The first patched build could not download the existing Google fonts under restricted networking; the network-enabled build passed.
- `node scripts/check-database-isolation.mjs` — passed.
- `node scripts/check-prescription-storage.mjs` — passed. This simulates Supabase's schema/roles/JWT subject in local PostgreSQL; it does not exercise the hosted Storage service or CDN.
- `node scripts/check-pdf-security.cjs` — passed against the actual handler with mocked Auth/Prisma/Storage/render boundaries.
- `node scripts/check-auth-redirect.mjs http://127.0.0.1:3107` — passed against the final production build, plus anonymous PDF/duplicate-check redirects and public login.
- A synthetic native-image encode/decode succeeded with sharp 0.35.5.
- Production migration deployment, authenticated real-account tests, old public URL/cache checks, dashboard settings and restore drills remain **pending**. No live data/settings were changed.

## Quick follow-up review — task/3.2 (2026-11-03)

Scope: current login/middleware/doctor gate, new draft/signature actions, PDF signed delivery and composed Storage policies. This supplements the original review; its earlier line references and audit counts are historical. No full dependency audit or live dashboard inspection was repeated. No new Critical issue was identified within this limited source review; this is not a production-security certification.

| Severity | Finding / current file:line | Concrete next action |
| --- | --- | --- |
| High | App admission is now gated, but direct Supabase Storage admission is still owner-based: `prisma/migrations/202611030004_private_prescription_storage/migration.sql:26` and `prisma/migrations/202611030005_signature_storage/migration.sql:10` use JWT UID/owner, not the app allowlist. Removing an email from ALLOWED_DOCTOR_EMAILS does not remove that identity's ability to read/write its own archived objects using an existing Supabase token. It does not grant access to a different owner's objects. | Complete DEPLOY.md's HUMAN account review; disable signup/anonymous providers, revoke unwanted identities, and account for already-issued token expiry. For immediate centrally managed revocation, add a restricted active-doctor membership check to private-bucket policies in a separately reviewed migration. Do not assume an app redirect or refresh-token revocation invalidates every access JWT or previously signed link. |
| High | Hosted RLS, bucket privacy, signed-link expiry, backup/restore and project availability remain unverified; existing source migrations cannot prove dashboard state. See `docs/STORAGE_SECURITY.md` and `docs/DB_NOTES.md`. | Owner applies migrations with the safe baseline flow, tests two synthetic identities and restores an isolated backup before real clinical use. |
| High | App login and costly authenticated actions have no application-wide abuse limiter (`actions/auth.actions.ts:33`, `app/api/prescriptions/[id]/pdf/route.tsx:8`). | Task 3.3: verify Supabase Auth limits/bot protection and implement shared limits for login/search/PDF/writes; do not rely on browser debounce or per-instance memory. |
| High | Identifying query strings and raw errors remain: `components/patients/PatientForm.tsx:62`, `components/patients/SearchInput.tsx:14`, `actions/auth.actions.ts:26`. | Move identifying searches to request bodies/actions, redact errors/log exports and restrict retention. The new middleware strips query strings when redirecting to login (`middleware.ts:45`), but this does not remove existing search/history/access-log exposure. |
| Medium | Profile/template schemas and patient bounds remain incomplete: `actions/auth.actions.ts:53`, `actions/templates.actions.ts:18`, `lib/validations/patient.schema.ts:4`. | Runtime-validate every input, cap strings/collections and validate dates. Signature upload already validates file size and magic bytes and derives its path from the authenticated doctor. |
| Medium | Browser security headers and medical-record read audit trail remain absent (`next.config.ts:3`, `prisma/schema.prisma`). | Task 3.3: add headers compatible with PDF blobs and a restricted actor/action/object/outcome audit trail without clinical text. |

Positive checks: `lib/auth/doctor-access.ts:4` requires exactly two distinct valid emails and fails closed on missing/malformed configuration. `actions/auth.actions.ts:9` verifies confirmed Auth identity and matching Doctor mapping; login validates before provider calls and rejects unprovisioned sessions. Middleware and the dashboard/root redirects enforce admission independently of protected record actions. Draft payloads/ownership and PDF relation ownership remain checked; signed URLs have a 60-second TTL and are not persisted. Private bucket guards withstand pre-existing broad permissive policies in local SQL tests.

The admission regression tests use synthetic identities and mocked Supabase/Prisma boundaries. Existing draft, PDF-handler, table-isolation and composed Storage-policy regressions were rerun locally. TypeScript and production build pass. Live JWT verification, signup disablement, real-account login/cookie flow and Storage/CDN expiry tests remain HUMAN work. Supabase notes that issued access tokens can remain valid until expiry after sign-out: [sign-out guidance](https://supabase.com/docs/guides/auth/signout).

Task 3.2 remains unchecked because its required dashboard step is not completed. The task batch stops there; 3.3–3.5 are not implemented or ticked by this quick review.

</details>
