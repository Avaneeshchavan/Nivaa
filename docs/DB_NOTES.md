# Database setup and baseline

## Status on 2026-11-03

The repository now contains `prisma/migrations/0_init/migration.sql`, generated from the current schema using `prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script`. This records all six application models. No model columns were changed. `postinstall: prisma generate` was already present and is retained.

The configured database could not be reached successfully: Prisma migration status failed, and an independent PostgreSQL connection attempt returned code `XX000`. No baseline was resolved on the remote database, no migration was applied, and the real seed was not run. The seed dry run validated 202 unique presentations. Authenticated `GET /api/medicines?q=para` remains unverified until database access and a doctor session are available.

## Connection settings

Run commands from the Nivaa repository root. Put valid connection strings in the ignored `.env` file:

- `DIRECT_URL`: PostgreSQL direct connection or Supabase session pooler connection suitable for Prisma migrations. Use the correct project-specific database username and password from Supabase's Connect panel. This is not the Supabase HTTP URL or anon key.
- `DATABASE_URL`: application PostgreSQL connection to the same database/schema.
- `SHADOW_DATABASE_URL`: a **separate disposable development database**, only if needed for `migrate dev`. Never set this to the clinic database; Prisma can reset its shadow database. The optional value is configured in `prisma.config.ts`.
- Keep the existing `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` for sign-in.

Do not put connection strings in Git or paste them into logs. If `XX000` persists, check the Supabase project status, connection username/project reference, password and connection mode.

## Existing database with tables (baseline without dropping data)

Take a database backup first. The baseline must reflect the **actual** application tables before it is marked as applied. Run:

```sh
npx prisma generate
npx prisma migrate status
git show 2d1e12e:prisma/schema.prisma > /tmp/nivaa-baseline.prisma
npx prisma migrate diff --from-config-datasource --to-schema /tmp/nivaa-baseline.prisma --exit-code
```

`migrate status` may report the pending `0_init` migration. The diff must report no differences and exit **0**. Exit **2** means schema drift; exit **1** means an error. In either case, stop this baseline procedure and reconcile the schema before continuing. Do not accept a database reset. Review existing policies, triggers, extensions and unmanaged tables separately; Prisma schema diff does not represent every PostgreSQL feature.

The comparison deliberately uses the schema recorded with `0_init`, since later tracked migrations change the current schema.

Only after verifying the diff is empty and `0_init` is not already recorded as applied:

```sh
npx prisma migrate resolve --applied 0_init
npx prisma migrate status
```

`resolve` only records migration history; it does not recreate the existing tables or alter their data. Do not execute `0_init/migration.sql` against tables that already exist. See the [Prisma 7 baseline workflow](https://www.prisma.io/docs/orm/v7/prisma-migrate/workflows/baselining).

## Fresh, empty development database

With connection settings pointing to an empty development database (and a separate shadow database if required), run the requested initialization command:

```sh
npx prisma migrate dev --name init
npx prisma generate
```

This applies the tracked `0_init` baseline. If the database has existing tables, use the previous baseline procedure instead. For an already baselined **development** database, `npx prisma migrate dev --name init` should report no schema changes. Stop if it asks to reset data. Use `npx prisma migrate deploy` to apply committed migrations in deployment environments after baselining; use `migrate dev --name <change>` only for future development schema changes. Stop using `db push` for tracked changes.

## Seed and verify

Prisma 7 uses `migrations.seed` in `prisma.config.ts`. The requested `package.json` `prisma.seed` entry is also provided. Both execute the same local TypeScript runner. Prisma 7 requires explicitly running `db seed` ([seeding docs](https://www.prisma.io/docs/orm/v7/prisma-migrate/workflows/seeding)).

```sh
npm ci
npx prisma generate
npx prisma db seed -- --dry-run
npx prisma db seed
npx prisma db seed
npm run dev
```

The two real seed runs exercise idempotency. IDs are derived from normalized name and form and used with `upsert`; repeating the same catalog creates no additional seed records and preserves existing edits. This does not deduplicate legacy records with unrelated IDs. Custom medicines use the same identity scheme. The shared Medicine model has no doctor column; only authenticated doctors can create custom catalog entries, and no patient details are stored in it. Strength is stored in the name; the other catalog fields match the existing model.

Read `docs/MED_REVIEW.md` before clinical use. To verify the HTTP route, sign in as a configured doctor at `http://localhost:3000/login`, then run this in that page's browser developer console (the browser sends the session cookies):

```js
const response = await fetch('/api/medicines?q=para', {
  credentials: 'same-origin',
  cache: 'no-store',
  redirect: 'error',
})
if (!response.ok) throw new Error(`Search failed: ${response.status}`)
const medicines = await response.json()
if (!Array.isArray(medicines) || !medicines.some(m => m.name.toLowerCase().includes('paracetamol'))) {
  throw new Error('Expected seeded paracetamol results')
}
console.table(medicines)
```

Expect paracetamol entries such as `Paracetamol 500 mg`. An anonymous request redirects to `/login` by design. After a recent empty search, use the no-store check above to avoid the API's five-minute private cache. For the custom-entry flow, search a new name, optionally enter strength/form, tap the 44px custom row, then enter the prescription details and tap Add to Prescription; repeat the same custom name/form and confirm it is reused.

## Phase 2 migrations

After resolving `0_init` on an existing database (or applying it to an empty database), apply subsequent migrations without resetting:

```sh
npx prisma migrate deploy
npx prisma generate
```

The patient-search migration installs pg_trgm and indexes; the database migration role needs extension/index creation privileges. Use `docs/SEARCH_NOTES.md` to verify search after deployment. Do not resolve later feature migrations as already applied unless their SQL has actually been applied and verified.

The visit-measurement migration adds nullable `weightKg`, `bloodPressure`, `temperatureC`, and `spo2` columns. Existing rows are left NULL. `Patient.allergies` already exists and is reused. Apply the migrations before starting this version of the app. Measurements are optional, checked on both client and server, and printed only when filled. A duplicated Rx copies medicines, diagnosis and notes; measurements start empty for the new visit. New Rx timestamps are generated on save, and printed dates use Asia/Kolkata.

Verification on local embedded PostgreSQL confirmed old visit values remain NULL after migration and filled measurements round-trip. Schema checks covered omitted/invalid values and allergy text; PDFs rendered for both filled and empty measurements with conditional headers. The hosted clinic database migrations and authenticated workflows remain pending valid database access.

## November 7 workflow migration

Applied `202611070001_workflow_notes` and `202611070002_handwriting_storage` to the existing database with `npx prisma migrate deploy`. They add medicine system classification, prescription handwriting JSON, visit/prescription history indexes, medicine-search indexes, and the private `prescription-notes` image bucket with owner-scoped restrictive policies. The changes are additive.

The Ayurvedic-only seed ran twice. The database contains 202 allopathic and 65 Ayurvedic presentations. Future deployments must apply tracked migrations before releasing code that reads the new fields. The existing RLS settings continue to cover the added application-table columns. Include the new private bucket in storage backups.

## November 7 security operations

Applied `202611070003_security_operations` and `202611070004_storage_membership` over the verified migration bridge. They add server-only RateLimit and append-only AuditLog tables, Doctor.active, and restrictive Storage membership checks. Twelve migrations are now applied. Runtime/seed PostgreSQL connections require verified TLS using the tracked public Supabase CA. Use `node scripts/migrate-verified.mjs status` or `deploy` on this machine because the native migration client's direct CA verification failed. See DEPLOY.md and BACKUPS.md.

## V2 N0: custom medicine details and duplicate prevention

`202611070005_custom_medicine_identity` adds the nullable manufacturer field and
an immutable text-normalization function plus a unique expression index on name
and form. Existing IDs, display text, generic values, systems and prescription
snapshots remain intact. Strength stays in the display name for compatibility.
Case, collapsed spaces, Unicode compatibility characters and hyphen separators
compare alike. Decimal points, slashes, different strengths and different forms
remain distinct; this is presentation deduplication, not clinical equivalence.
Existing matches are returned unchanged with “Already exists” feedback.

The migration is transactional and aborts on pre-existing normalized collisions;
it never merges or deletes medicine records. Review such collisions with the
doctors before rerunning. Do not reset the database or edit an applied migration.
Prisma cannot express this functional unique index in its model; retain the
tracked SQL index during future migration generation/introspection.

Run from the repository after supplying existing environment configuration:

```sh
npx prisma generate
node scripts/migrate-verified.mjs status
node scripts/migrate-verified.mjs deploy
node scripts/migrate-verified.mjs status
node scripts/check-custom-medicine.cjs
node scripts/check-medicine-picker.cjs
```

The existing verified-TLS migration helper is unchanged in N0. Simplifying it is
N7 work. This migration adds catalog metadata only; it changes no authentication,
RLS, grants, security policies, patient tables or prescription data. N1 still
needs a chosen, licensed brand dataset; N0 does not import any brand data.
