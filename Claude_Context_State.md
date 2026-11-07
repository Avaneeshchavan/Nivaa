> Historical November 2 snapshot. Current source, hosted evidence and open conditions are in `docs/STATUS.md`, `docs/PLAN_AUDIT.md` and `CLAUDE_HANDOFF.md`. The original snapshot below is preserved for comparison.

# CLAUDE_CONTEXT_STATE.md
**Project:** Nivaa Clinic Prescription Application (iPad-First EHR/Prescription Builder)  
**Last Updated:** 2026-11-02  
**Current Next.js Build Status:** Passing (`npm run build` clean, 0 TypeScript errors, 0 linter warnings)

---

## 1. Executive Summary & Architecture Overview

Nivaa is a modern, responsive, iPad-first web application designed for outpatient clinics and private practitioners to manage patients, draft and generate standardized digital prescriptions, manage clinical disease templates, and customize clinic branding.

### Core Tech Stack
| Layer | Technologies |
|---|---|
| **Framework** | Next.js 15.5.18 (App Router, Server Actions, Route Handlers) |
| **Runtime & Language** | Node.js, TypeScript 5, React 19.2.4 |
| **Styling & UI** | Tailwind CSS v4 (`@tailwindcss/postcss`), shadcn/ui powered by `@base-ui/react` primitives, `lucide-react` |
| **Database & ORM** | PostgreSQL (hosted on Supabase), Prisma 7.8.0 with `@prisma/adapter-pg` and custom client generation to `lib/generated/prisma` |
| **Authentication** | Supabase Auth (`@supabase/ssr` 0.10.3, `@supabase/supabase-js` 2.106.0) utilizing cookie-based session verification |
| **PDF Generation & Storage** | `@react-pdf/renderer` 4.5.1 (live client-side preview via `PDFViewerWrapper` + server-side streaming via `renderToStream`), Supabase Storage (`prescriptions`, `logos` buckets) |
| **Client State Management** | Zustand 5 (`useClinicStore`, `useRxBuilderStore`) |
| **Validation & Forms** | React Hook Form 7.76.0 + Zod 4.4.3 (`@hookform/resolvers`) |

### System Topology
```
                     +----------------------------+
                     |   Client (iPad / Desktop)  |
                     +--------------+-------------+
                                    |
                  HTTPS / Cookies   |
                                    v
+-----------------------------------------------------------------------+
| Next.js 15 App Router (`/app`)                                         |
|  - middleware.ts: Supabase session check                              |
|  - Server Actions: auth, patients, prescriptions, templates           |
|  - Route Handlers: /api/medicines, /api/prescriptions/[id]/pdf       |
+-------------------+-------------------------------+-------------------+
                    |                               |
       Direct Pool  |                               | Auth & Storage
                    v                               v
         +--------------------+          +---------------------+
         | PostgreSQL (Prisma)|          |  Supabase Platform  |
         |  - Doctor          |          |   - Auth (GoTrue)   |
         |  - Patient         |          |   - Bucket: 'logos' |
         |  - Visit           |          |   - Bucket: 'presc' |
         |  - Prescription    |          +---------------------+
         |  - Medicine        |
         |  - DiseaseTemplate |
         +--------------------+
```

---

## 2. Workspace File Structure & Map

```
/Users/avaneeshchavan/VS Code/Nivaa
├── actions/                         # Next.js Server Actions ('use server')
│   ├── auth.actions.ts              # getCurrentDoctor, signOut, updateDoctorProfile
│   ├── patients.actions.ts          # getPatients, getPatient, createPatient, updatePatient
│   ├── prescriptions.actions.ts     # createPrescription (auto-creates Visit & Prescription)
│   └── templates.actions.ts         # getTemplates, createTemplate, updateTemplate, deleteTemplate, seedDefaultTemplates
├── app/                             # Next.js 15 App Router
│   ├── (auth)/
│   │   └── login/page.tsx           # Doctor email/password login (Supabase client auth)
│   ├── (dashboard)/                 # Protected route group with two-panel layout
│   │   ├── layout.tsx               # Sidebar + Header + Mobile BottomNav + Content shell
│   │   ├── @headerAction/default.tsx# Parallel route slot for header actions
│   │   ├── patients/
│   │   │   ├── page.tsx             # Patient directory, debounced search, FAB (+ New Patient)
│   │   │   ├── loading.tsx          # 6-card skeleton loader
│   │   │   ├── new/page.tsx         # Patient creation route
│   │   │   ├── [id]/page.tsx        # Patient profile, visit history, diagnosis timeline
│   │   │   └── [id]/edit/page.tsx   # Patient update route
│   │   ├── prescriptions/
│   │   │   └── new/page.tsx         # Two-column Rx builder + live PDF preview
│   │   └── settings/
│   │       └── page.tsx             # Doctor profile, logo upload, template manager
│   ├── api/
│   │   ├── medicines/route.ts       # GET: Medicine lookup query by brand or generic name
│   │   └── prescriptions/[id]/pdf/
│   │       └── route.tsx            # GET: Server-renders PDF, saves to Supabase, returns inline stream
│   ├── favicon.ico
│   ├── globals.css                  # Tailwind v4 theme, oklch color variables, safe-area utilities
│   ├── layout.tsx                   # Root HTML structure and font loading
│   └── page.tsx                     # Default Next.js starter page (NEEDS REDIRECT)
├── components/                      # UI Components
│   ├── StoreInitializer.tsx         # Hydrates doctor metadata into Zustand clinicStore
│   ├── dashboard/
│   │   ├── BottomNav.tsx            # Mobile fixed bottom navigation (<md breakpoint)
│   │   ├── Header.tsx               # Top app bar displaying reactive title & action slots
│   │   ├── HeaderContext.tsx        # Context for updating dynamic header titles per page
│   │   ├── HeaderSetter.tsx         # Client helper to declare page titles in Server Components
│   │   └── Sidebar.tsx              # Fixed left nav (w-64) for iPad/Desktop with doctor badge
│   ├── patients/
│   │   ├── PatientForm.tsx          # Zod-validated patient form (touch-friendly h-12 inputs)
│   │   └── SearchInput.tsx          # Debounced URL search query updater
│   ├── prescriptions/
│   │   ├── DiseaseTemplateSelector.tsx # Quick-load dropdown with overwrite confirmation
│   │   ├── MedicineAutocomplete.tsx # Combobox + dosage/freq/duration inline entry
│   │   ├── PDFViewerWrapper.tsx     # Client-only dynamic wrapper for @react-pdf PDFViewer
│   │   ├── RxBuilder.tsx            # Core prescription composer (form + preview grid)
│   │   ├── RxPDFDocument.tsx        # Standardized A5/Letter printable prescription document
│   │   └── RxPreview.tsx            # Live reactive PDF viewer pane (sticky on iPad)
│   ├── settings/
│   │   └── SettingsView.tsx         # Profile form, Supabase logo upload, template CRUD Sheet
│   └── ui/                          # shadcn/ui components (Base UI primitives)
├── lib/
│   ├── generated/prisma/            # Generated Prisma client binaries and types
│   ├── prisma.ts                    # PrismaPg singleton connected to DATABASE_URL pool
│   ├── utils.ts                     # cn() helper (clsx + tailwind-merge)
│   ├── supabase/
│   │   ├── client.ts                # Browser Supabase client (createBrowserClient)
│   │   └── server.ts                # Server Supabase client (createServerClient + cookies)
│   ├── templates/
│   │   └── defaultTemplates.ts      # 5 clinical pre-seed packs (HTN, T2DM, URTI, Gastritis, UTI)
│   └── validations/
│       └── patient.schema.ts        # Zod schema for patient details & phone regex
├── prisma/
│   ├── schema.prisma                # Database schema
│   └── (migrations missing)         # Schema deployed via db push; no migrations dir
├── store/
│   └── clinicStore.ts               # Zustand store for doctorName, clinicName, logoUrl
├── stores/
│   └── rxBuilderStore.ts            # Zustand store for active draft Rx items & diagnosis
├── types/
│   ├── index.ts                     # PatientWithVisits, VisitWithPrescriptions, etc.
│   └── supabase.ts                  # Supabase Database type stub (currently empty)
├── clinic-app/                      # ORPHAN: Duplicate clean create-next-app folder (SAFE TO DELETE)
├── middleware.ts                    # Supabase session check and auth route gating
├── next.config.ts                   # Next.js configuration
├── package.json                     # Dependencies and build scripts
├── prisma.config.ts                 # Prisma config for CLI commands (reads DIRECT_URL)
└── tsconfig.json                    # Path aliases (@/* -> ./*)
```

---

## 3. Database Schema & Data Models

Prisma output path is configured to `./lib/generated/prisma`.

```prisma
model Doctor {
  id            String            @id @default(cuid())
  supabaseId    String            @unique
  email         String            @unique
  name          String?
  createdAt     DateTime          @default(now())
  updatedAt     DateTime          @updatedAt
  license       String?
  clinicName    String?
  address       String?
  phone         String?
  logoUrl       String?
  patients      Patient[]
  visits        Visit[]
  prescriptions Prescription[]
  templates     DiseaseTemplate[]
}

model Patient {
  id            String            @id @default(cuid())
  doctorId      String
  name          String
  dob           DateTime?
  gender        String?
  phone         String?
  address       String?
  allergies     String?
  createdAt     DateTime          @default(now())
  updatedAt     DateTime          @updatedAt
  doctor        Doctor            @relation(fields: [doctorId], references: [id])
  visits        Visit[]
  prescriptions Prescription[]
}

model Visit {
  id            String            @id @default(cuid())
  patientId     String
  doctorId      String
  date          DateTime          @default(now())
  diagnosis     String?
  createdAt     DateTime          @default(now())
  updatedAt     DateTime          @updatedAt
  patient       Patient           @relation(fields: [patientId], references: [id])
  doctor        Doctor            @relation(fields: [doctorId], references: [id])
  prescriptions Prescription[]
}

model Prescription {
  id            String            @id @default(cuid())
  patientId     String
  visitId       String?
  doctorId      String
  diagnosis     String?
  notes         String?
  medicines     Json              @default("[]")
  pdfUrl        String?
  createdAt     DateTime          @default(now())
  updatedAt     DateTime          @updatedAt
  patient       Patient           @relation(fields: [patientId], references: [id])
  visit         Visit?            @relation(fields: [visitId], references: [id])
  doctor        Doctor            @relation(fields: [doctorId], references: [id])
}

model Medicine {
  id            String            @id @default(cuid())
  name          String
  generic       String?
  form          String?
  createdAt     DateTime          @default(now())
  updatedAt     DateTime          @updatedAt
}

model DiseaseTemplate {
  id            String            @id @default(cuid())
  doctorId      String
  name          String
  diagnosis     String?
  medicines     Json              @default("[]")
  createdAt     DateTime          @default(now())
  updatedAt     DateTime          @updatedAt
  doctor        Doctor            @relation(fields: [doctorId], references: [id])
}
```

---

## 4. Current State of Features & Implementation Audit

### Fully Working Features
1. **Authentication Flow**:
   - `/login` validates credentials with Supabase `signInWithPassword`.
   - On success, redirects to `/patients`.
   - `getCurrentDoctor()` resolves `supabase.auth.getUser().id` to Prisma `Doctor` row.
   - `signOut()` terminates session and redirects to `/login`.
2. **Patient Management (`/patients`)**:
   - Card grid layout (2-column on iPad, 1-column on mobile).
   - Real-time debounced search by name or phone.
   - Add Patient (`/patients/new`) & Edit Patient (`/patients/[id]/edit`) with Zod form validation.
   - View Patient (`/patients/[id]`) with tabs for visits history and patient details.
3. **Prescription Builder (`/prescriptions/new`)**:
   - iPad two-column layout: Form on left, live sticky PDF preview on right.
   - Auto-loads patient if `?patientId={id}` is provided in URL; otherwise shows searchable select.
   - Live synchronization between Zustand `rxBuilderStore` and `@react-pdf/renderer` preview.
   - Template selection with alert warning before overwriting existing form state.
   - "Save Draft" and "Save & Print Rx" (opens `/api/prescriptions/[id]/pdf` in new tab).
4. **PDF Generation Engine (`/api/prescriptions/[id]/pdf`)**:
   - Verifies doctor ownership of prescription.
   - Renders PDF stream using `renderToStream(<RxPDFDocument />)`.
   - Uploads to Supabase Storage bucket `prescriptions` under `{doctorId}/{prescriptionId}.pdf`.
   - Updates `Prescription.pdfUrl` in database.
   - Returns PDF stream with `Content-Disposition: inline`.
5. **Disease Templates & Settings (`/settings`)**:
   - Profile management (name, license, clinic name, address, phone).
   - Clinic logo upload directly to Supabase bucket `logos`, saving public URL to doctor record.
   - Slide-over Sheet for template creation and editing with live medicine search.
   - "Add common templates" button that seeds 5 clinical templates (Hypertension, T2DM, URTI, Gastritis, UTI).

---

## 5. Identified Defects, Incomplete Code & Architectural Risks

### Critical Bugs & Functional Gaps

| Area | Issue Description | Impact | Location |
|---|---|---|---|
| **Root URL** | `app/page.tsx` still renders the boilerplate Next.js starter page instead of redirecting to `/patients` or `/login`. | Users hitting `/` see Next.js default landing page. | `app/page.tsx` |
| **Middleware Protection Gap** | In `middleware.ts`, `isProtectedRoute` only checks `pathname.startsWith('/dashboard') \|\| pathname.startsWith('/patients')`. Because `(dashboard)` is a route group, `/prescriptions/new` and `/settings` are **NOT** matched. | Unauthenticated users can load `/prescriptions/new` and `/settings` shells without login redirect. | `middleware.ts:34-36` |
| **Sidebar 404 Link** | `Sidebar.tsx` has `{ name: 'Templates', href: '/templates' }`. No `/templates` route exists in `app/`. | Clicking "Templates" in desktop/iPad sidebar triggers a 404 page. | `components/dashboard/Sidebar.tsx:13` |
| **Patient History "View Rx"** | The "View Rx" button rendered for visits in `PatientDetailsPage` has no `href` or `onClick` handler. | Doctors cannot view or re-print prior prescriptions from visit history. | `app/(dashboard)/patients/[id]/page.tsx:92-95` |
| **Medicine Database Empty** | There is no seed script for the `Medicine` table. `MedicineAutocomplete` queries `/api/medicines`. If the table is empty, search yields 0 results. Furthermore, `MedicineAutocomplete` does not allow typing a custom medicine name manually. | Prescription builder is completely blocked if `Medicine` table is unseeded. | `components/prescriptions/MedicineAutocomplete.tsx` & `app/api/medicines/route.ts` |
| **Vercel Build Script** | `package.json` does not include `"postinstall": "prisma generate"`. | Deployment on Vercel or fresh CI container may fail during Next.js build because `lib/generated/prisma` client is missing. | `package.json` |

### Architectural Inconsistencies & Code Smells

1. **Store Folder Duplication**:
   - `store/clinicStore.ts` (singular) vs `stores/rxBuilderStore.ts` (plural). Should be consolidated into `stores/`.
2. **StoreInitializer Incomplete**:
   - `DashboardLayout` mounts `<StoreInitializer doctorName={doctor?.name} />` but omits `clinicName={doctor?.clinicName}` and `logoUrl={doctor?.logoUrl}`.
3. **Empty Supabase Type Stub**:
   - `types/supabase.ts` is an empty stub with `never` types rather than generated Supabase types.
4. **Prisma Migrations Not Tracked**:
   - `prisma/migrations` folder does not exist because changes were pushed via `db push`. Team cannot review database version diffs.
5. **Orphan `clinic-app/` Directory**:
   - An entire secondary Next.js app sits inside `./clinic-app/` (likely generated accidentally during bootstrapping).

---

## 6. Recent Work & Commit Context

- **Recent Activity**:
  - Implementation of Prompt 8 (Disease Templates & Settings): Created `actions/templates.actions.ts`, `components/settings/SettingsView.tsx`, `lib/templates/defaultTemplates.ts`.
  - Resolved Base UI TypeScript compatibility issues in `PDFViewerWrapper.tsx`, `RxPDFDocument.tsx`, `RxPreview.tsx`, and `SettingsView.tsx`.
  - Next.js production build (`next build`) was verified and compiles cleanly.
- **Git State**:
  - The local directory `/Users/avaneeshchavan/VS Code/Nivaa` is not yet an initialized git repository (git was previously tracking from `/Users/avaneeshchavan`).

---

## 7. Prioritized Action Plan to Reach Production-Ready State

### Tier 1: Immediate Functional Fixes (Must Do First)
1. **Fix `middleware.ts` Protection**:
   Update matcher logic:
   ```ts
   const isProtectedRoute = 
     request.nextUrl.pathname.startsWith('/patients') ||
     request.nextUrl.pathname.startsWith('/prescriptions') ||
     request.nextUrl.pathname.startsWith('/settings') ||
     request.nextUrl.pathname.startsWith('/templates')
   ```
2. **Redirect Root (`app/page.tsx`)**:
   Replace boilerplate with server redirect to `/patients`.
3. **Fix Sidebar Navigation Link**:
   Change `/templates` link in `components/dashboard/Sidebar.tsx` to `/settings` (or create a dedicated `/templates` page that renders the templates manager).
4. **Connect "View Rx" in Patient Details**:
   Wrap "View Rx" button in `app/(dashboard)/patients/[id]/page.tsx` with:
   ```tsx
   <a href={`/api/prescriptions/${visit.prescriptions[0].id}/pdf`} target="_blank" rel="noopener noreferrer">
     <Button variant="secondary" size="sm">View Rx</Button>
   </a>
   ```
5. **Enable Custom Medicine Entry in `MedicineAutocomplete.tsx`**:
   Add a fallback button: `"Add '<search>' as custom medicine"` when no search results are returned, allowing doctors to prescribe medicines not present in the master database.

### Tier 2: Database & CI/CD Readiness
6. **Create Medicine Master Seed Script**:
   Write a `prisma/seed.ts` script populating 100+ standard generic and brand medicines (antibiotics, analgesics, antipyretics, antihypertensives, antidiabetics, antacids).
7. **Add Prisma Postinstall Script**:
   Update `package.json`:
   ```json
   "scripts": {
     "postinstall": "prisma generate",
     "build": "next build"
   }
   ```
8. **Verify Supabase Storage Bucket Policies**:
   Ensure `prescriptions` and `logos` buckets are created in Supabase with RLS policies allowing authenticated uploads and public or signed reading.

### Tier 3: Codebase Cleanliness & Hygiene
9. **Consolidate Store Folders**:
   Move `store/clinicStore.ts` -> `stores/clinicStore.ts` and update import in `components/dashboard/Sidebar.tsx` and `components/StoreInitializer.tsx`.
10. **Delete Orphan `clinic-app/` Folder**:
    Remove `clinic-app/` to reduce workspace footprint.
11. **Initialize Clean Git Repository**:
    Run `git init` within `/Users/avaneeshchavan/VS Code/Nivaa` and commit current verified state.
