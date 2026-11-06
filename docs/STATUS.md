# Nivaa code status

Compared with `Claude_Context_State.md` on 2026-11-03. This is a source-code audit, not a live Supabase or Storage test.

## Verification

- `npm run build` — passed with Next.js 15.5.18; all routes compiled. The generated route list contains `/`, `/login`, `/patients`, `/prescriptions/new`, `/settings`, and the API routes, but no `/templates` route.
- `npx tsc --noEmit` — passed with no output.
- The build reports `.env.local` and `.env` as environment inputs. Both are ignored by Git; neither is staged.

## Features implemented in the code

- Supabase email/password sign-in, cookie-backed server client, doctor lookup by Supabase user ID, and sign-out are implemented in `app/(auth)/login/page.tsx:14-55`, `lib/supabase/server.ts`, and `actions/auth.actions.ts:7-35`.
- Patient listing, name/phone search, create, edit, ownership checks, and patient visit history are wired through `app/(dashboard)/patients/page.tsx`, `components/patients/PatientForm.tsx`, and `actions/patients.actions.ts:8-95`.
- Prescription entry persists a visit and prescription after checking patient ownership; template selection, medicine lookup, notes, and a live PDF preview are wired in `components/prescriptions/RxBuilder.tsx:23-70` and `actions/prescriptions.actions.ts:15-51`.
- The PDF endpoint checks doctor ownership, renders the prescription, attempts a Supabase Storage upload, and returns the PDF inline in `app/api/prescriptions/[id]/pdf/route.tsx:8-83`.
- Clinic profile editing, logo upload, and disease-template create/edit/delete and starter-template actions are present in `components/settings/SettingsView.tsx` and `actions/templates.actions.ts`.

These flows compile, but require configured Supabase and PostgreSQL services and were not exercised against live accounts or data here.

## Reported defects and gaps

| Context item | Current result | Code location |
|---|---|---|
| Root URL still shows the Next.js starter page | **Still exists.** `/` renders starter copy, not a redirect. | `app/page.tsx:1-65` |
| Middleware protection omits prescriptions and settings | **Matcher gap still exists.** `isProtectedRoute` only matches `/dashboard` and `/patients`. The prescription page separately redirects when no doctor is found; the settings page calls `getTemplates()`, which throws without a doctor, so the context’s claim that both simply render their shells is stronger than the code supports. | `middleware.ts:34-40`; `app/(dashboard)/prescriptions/new/page.tsx:14-16`; `app/(dashboard)/settings/page.tsx:8-15`; `actions/templates.actions.ts:8-10` |
| Sidebar Templates link points to a missing route | **Still exists.** The link targets `/templates`; no such route is in `app/` or the build route list. | `components/dashboard/Sidebar.tsx:10-15` |
| Patient history “View Rx” has no action | **Still exists.** It is a plain button without a link or handler. | `app/(dashboard)/patients/[id]/page.tsx:91-95` |
| Medicine catalog has no seed data and autocomplete has no custom entry | **Partly verifiable.** No medicine seed script exists in `prisma/`; the autocomplete only displays “No medicines found” and requires selecting a catalog result. Whether the deployed database is empty cannot be determined from this checkout. | `components/prescriptions/MedicineAutocomplete.tsx:34-49, 108-116`; `app/api/medicines/route.ts:18-28`; `prisma/` contains only `schema.prisma` |
| Missing Prisma postinstall generation | **No longer applies.** `postinstall` already runs `prisma generate`. | `package.json:5-11` |
| Duplicate store folders | **Still exists.** Clinic data is under `store/`; prescription state is under `stores/`. | `store/clinicStore.ts`; `stores/rxBuilderStore.ts` |
| StoreInitializer does not receive clinic name or logo | **Still exists.** The component accepts both, but the dashboard layout passes only the doctor name. | `app/(dashboard)/layout.tsx:18-23`; `components/StoreInitializer.tsx:6-25` |
| Supabase type stub is empty | **Still exists.** Tables, views, functions, enums, and composite types are `never`. | `types/supabase.ts:9-25` |
| Prisma migrations are not tracked | **Still exists.** There is no `prisma/migrations/` directory in this checkout. | `prisma/` |
| Orphan `clinic-app/` folder | **Resolved in this task.** It was present at inspection and has been deleted. | `clinic-app/` (removed) |

## Additional code differences not called out in the context

- “Save Draft” immediately creates a visit and prescription in the database; there is no draft state in the schema or save action. | `components/prescriptions/RxBuilder.tsx:46-68, 155-173`; `actions/prescriptions.actions.ts:26-45`; `prisma/schema.prisma:66-80`
- The live PDF preview uses placeholder doctor and patient data and a hard-coded clinic name, rather than the selected patient and profile values. The generated PDF endpoint also passes the hard-coded clinic name. | `components/prescriptions/RxPreview.tsx:27-49`; `app/api/prescriptions/[id]/pdf/route.tsx:31-39`
- The template seeding action counts existing templates but does not use the count to avoid duplicates; every invocation inserts all defaults again. | `actions/templates.actions.ts:87-107`
- PDF and logo uploads request public URLs from the `prescriptions` and `logos` buckets. Bucket visibility and policies cannot be confirmed from repository code. | `app/api/prescriptions/[id]/pdf/route.tsx:48-74`; `components/settings/SettingsView.tsx:111-139`
