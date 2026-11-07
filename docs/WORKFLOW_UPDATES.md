# Workflow updates

## Faster navigation and saves

Doctor identity is memoized within a React server render. Each new request verifies its own identity. Patient-directory queries select name, phone and last-visit date. Visit history selects prescription identifiers and dates instead of fetching medicine JSON twice. Patient edits perform one ownership-scoped update.

The prescription page loads its draft, duplicate source and templates concurrently. It fetches only the selected patient's summary. The generic builder searches names and phones through a bounded, cancellable GET request. The global patient search also uses cancellable GET requests so it can run alongside draft writes. Draft writes wait for 1.5 seconds of inactivity.

PDF code and branding downloads start when the doctor chooses **Show print preview**. Saving and printing work independently of preview. A loading screen gives immediate navigation feedback. Database pools are limited to three connections per process. Functions run in Mumbai, matching the existing Supabase database region.

The local production build reports approximately 220 KB of initial JavaScript for the prescription page. This measures downloaded code. End-to-end signed-in navigation latency still needs a browser measurement. Browser automation could enumerate the open clinic tab but could not attach to it because `browser.user` was unavailable.

## Ayurvedic medicines

65 Ayurvedic presentations were added alongside the existing 202 allopathic presentations. Select **Ayurvedic** under **Medicine system**, then search by name. Custom medicines inherit the selected system. Ayurvedic selections require the doctor to enter dosage, frequency and duration.

Names and preparation categories were checked against the National AYUSH Mission essential-drug list. The catalog contains names and forms. Doctors enter prescribing details for the individual patient. Alternate Ashwagandha spelling is searchable.

The selection of 65 classical formulations is an initial catalog. The doctors can add the brands and presentations they actually stock through custom medicine entry. Source spelling and formulation categories are retained, including Churna, Guggulu, Taila, Asava and Arishta. [National AYUSH Mission essential-drug list](https://namayush.gov.in/content/essential-drugs-list-ayurveda)

Run the additive seed with `node --import tsx prisma/seed.ts --ayurvedic-only`. Run it twice to check idempotency. Existing rows are matched by normalized name and form, including earlier seeds that used generated identifiers. Existing edits are preserved.

## Handwritten notes

New prescriptions include **Handwritten notes** below typed advice. Draw with a mouse, finger or Pencil. Undo and Clear drawing have 44-pixel minimum controls. Each completed stroke participates in draft autosave. Choose a patient before drawing.

**Attach paper note** accepts JPG, PNG or WebP photos. The browser resizes and converts them to JPEG before uploading, removing original image metadata. Uploads use private Storage paths under the authenticated doctor's UUID. Drawing and uploading disable prescription saving until complete. Uploaded image files are limited to 750 KB.

To add details later, open the patient's visit history and choose **Add / edit notes**. Save notes, then choose **View Rx** for an updated printout. Concurrent edits to an existing prescription are detected and require review before overwriting. Saved-note editing uses the Save notes button. New-Rx handwriting uses draft autosave.

Drawings and attached photos print on separate, patient-labelled pages after the typed prescription. Handwriting is preserved as vector strokes. A duplicated prescription starts with blank handwriting for the new visit. Earlier prescriptions and drafts without handwriting remain readable.

Physical Apple Pencil behavior and signed-in browser interactions have not been device-tested in this environment. Input uses standard Pointer Events. Photos currently support JPG, PNG and WebP files. Supported input and printing are covered by synthetic tests.

Private note photos are immutable uploads. Removing a photo detaches it from the note. Historical and unreferenced uploads are retained, so an existing prescription or restored draft cannot lose its image through a later edit. Include the `prescription-notes` bucket in clinic backups and retention procedures.

## Verification

- `npx tsc --noEmit`
- `npm run build`
- `node scripts/check-query-budget.cjs`
- `node scripts/check-workflow-notes.cjs`
- `node scripts/check-doctor-access.cjs`
- `node scripts/check-drafts.cjs`
- `node scripts/check-pdf-security.cjs`
- `node scripts/check-storage-config.mjs`
- `node scripts/check-database-isolation.mjs`
- `node scripts/check-prescription-storage.mjs`
- Synthetic A4/A5 PDF rendering with drawings and an attached photo

The two additive migrations were applied with `prisma migrate deploy`. The Ayurvedic-only seed was run twice against the existing database. Counts remained 202 allopathic and 65 Ayurvedic entries. A live SQL search returned both Triphala presentations. The sample database query executed in 0.448 ms, excluding authentication and network time.
