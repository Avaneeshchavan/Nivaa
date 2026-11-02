# Patient search and duplicate checks

Apply the tracked migrations before using these features. Search is limited to the current doctor's patients, case-insensitively matching name, phone, visit/prescription diagnosis, or a medicine's name inside stored Rx JSON. Query parameters are bound, LIKE wildcards are escaped, and only the 50 most recently updated matches are returned. Refine the query if 50 are shown. Search uses a 150ms debounce and aborts stale requests; it updates the directory without re-rendering the whole page on the server.

The migration enables `pg_trgm`, adds GIN indexes and doctor/relationship indexes, plus expression indexes for medicine names and normalized phone digits. Duplicate warnings require the same phone digits and trigram name similarity >= 0.35, within the current doctor's records. Country prefixes are not guessed. Warnings offer an existing-record link but never prevent saving. The helper function's search path supports Supabase installations where pg_trgm is already in the extensions schema. Keep the SQL expression indexes/function when creating future migrations; Prisma cannot represent expression indexes in its schema.

## Verification

The baseline and search migration ran successfully on the embedded PostgreSQL engine already installed with Prisma tooling (no dependency added). A synthetic fixture with 10,000 patients, 30,000 visits and 30,000 prescriptions exercised the actual SQL from the action: name, phone, diagnosis, medicine-name-only matching, wildcard escaping, doctor isolation, and similar-name/same-phone duplicate detection passed. Sixty warm database-only samples per run measured p95 of 72–102ms on this machine (including a run alongside the production build). This excludes Supabase authentication, HTTP, rendering and the typing debounce and is not an end-to-end latency claim.

The configured clinic database previously returned XX000; real authenticated HTTP latency remains to be measured after valid DB access and migration deployment. With the app running locally and a doctor signed in, set NIVAA_SESSION_COOKIE privately to that browser's Cookie request header, then run representative fixture queries:

```sh
node scripts/check-patient-search.mjs 'Asha' '9900000001' 'Hypertension' 'Paracetamol'
```

The script asserts HTTP p95 below 300ms across warm samples and fails on redirects or errors. Use representative local data; never put real patient details or cookies in Git or shared logs. The benchmark does not print search terms or cookies.
