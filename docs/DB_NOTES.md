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
npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code
```

`migrate status` may report the pending `0_init` migration. The diff must report no differences and exit **0**. Exit **2** means schema drift; exit **1** means an error. In either case, stop this baseline procedure and reconcile the schema before continuing. Do not accept a database reset. Review existing policies, triggers, extensions and unmanaged tables separately; Prisma schema diff does not represent every PostgreSQL feature.

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
