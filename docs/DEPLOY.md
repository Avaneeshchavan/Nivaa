# Nivaa deployment and access runbook

Production is `https://nivaa-kohl.vercel.app` in the existing Vercel `nivaa` project. The project uses Node 22, the explicit Next.js preset and Mumbai (`bom1`) functions. Preserve this project identity when deploying updates.

## Required application variables

| Name | Source and purpose |
| --- | --- |
| NEXT_PUBLIC_SUPABASE_URL | Supabase Project Settings → API / project URL. Used by Auth and Storage. |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Same project → API Keys → existing public anon key. Public by design and constrained by RLS. |
| DATABASE_URL | Supabase Connect → transaction/session pooler connection for Prisma runtime. Server-only. |
| DIRECT_URL | Supabase Connect → direct or session-pooler connection suitable for migrations. Server-only. |
| ALLOWED_DOCTOR_EMAILS | Exactly the two approved doctor emails, comma separated. Server-only. |

All five are already configured for this production project. Keep secrets in the existing local secret environment and Vercel's encrypted variable store. A source archive excludes all `.env*` files. Backup-only variables are described in BACKUPS.md and belong in the trusted backup environment.

## Doctor admission

Supabase Authentication settings currently report disabled public signup. There are two confirmed allowlisted Doctor/Auth mappings. Keep unused/anonymous providers disabled and review account administrator MFA. Test the two normal accounts on the clinic devices.

For immediate doctor revocation, the database administrator sets that Doctor row's `active` value to false and handles Supabase session/account revocation. The app and Storage membership function check this flag. Changing only the Vercel email variable leaves direct Storage membership to the database rule. Existing signed PDF links last up to 60 seconds. Account recovery and password changes are owner operations.

## Release commands

Start from the intended branch with all intended source changes committed. Review the diff and confirm the Git remote is Avaneeshchavan/Nivaa. Install the locked dependencies, generate Prisma, run tests and apply additive migrations before releasing code that reads added columns.

```sh
npm ci
npx prisma generate
npx tsc --noEmit
npm run build
node scripts/check-security-operations.cjs
node scripts/check-storage-config.mjs
node scripts/migrate-verified.mjs deploy
```

The migration helper works around the native engine's CA-loading failure on this machine. It binds an ephemeral loopback listener and establishes certificate/hostname-verified TLS to Supabase before forwarding startup or authentication bytes. Only local loopback traffic uses a non-TLS PostgreSQL connection. Runtime and seed connections use verified TLS directly. The official public CA is tracked and included in function traces, with validity through April 2031. Review certificate rotation before expiry.

Use the existing `.vercel/project.json` association and deploy only tracked committed source. The project is already linked, so relinking is unnecessary. `vercel link` can update local tooling environment state.

```sh
nivaa_stage=$(mktemp -d /tmp/nivaa-deploy.XXXXXX)
git archive --format=tar HEAD | tar -xf - -C "$nivaa_stage" --exclude='.env*'
mkdir "$nivaa_stage/.vercel"
cp .vercel/project.json "$nivaa_stage/.vercel/project.json"
npx --yes vercel@latest deploy --prod --yes --scope avaneeshchavans-projects --cwd "$nivaa_stage"
node scripts/smoke-test.mjs https://nivaa-kohl.vercel.app
node scripts/check-availability.mjs
```

Wait for READY and the production alias. Inspect function outputs to confirm `bom1`. Public smoke tests exercise anonymous access. Complete the signed-in checklist in PARENTS_QUICKSTART.md on the target devices.

## Logging and previews

New patient-search and duplicate-check UI requests send clinical search terms in bounded POST bodies. Search terms are removed from browser URLs. Keep request-body logging disabled in platform log drains and integrations. The legacy GET search endpoints remain for old deployed clients and should be retired after the transition. Console errors use generic messages.

The application audit log stores doctor ID, action, resource ID and timestamp. Primary database writes and their audit event commit together. Working drafts, directory result views and direct Storage reads have the coverage limitations in SECURITY_REVIEW.md. Audit metadata is sensitive and remains server-only.

Use isolated synthetic-data projects for previews and review preview access controls. The source code cannot prove Vercel/Supabase organization MFA, log-retention policy or future environment changes. Keep private clinic records and credentials out of handoff files and screenshots.

## Recovery and availability

Follow BACKUPS.md for the full application/Storage export, weekly procedure, isolated restoration and Free-plan pause contingency. Twelve current tracked migrations are additive to the original baseline. Avoid migration reset or data-dropping flows against the clinic project. Certificate and admission changes require restarting a local development server so it creates a new connection pool.
