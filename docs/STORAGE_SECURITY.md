# Private records and Storage (task 3.1)

Application data is accessed through authorized Prisma calls. The baseline tables plus RxDraft have RLS enabled, browser grants revoked and a restrictive deny policy; they deliberately have no direct browser Data API policy. The trusted server connection still requires doctor ownership checks on every operation. Do not grant browser access to Doctor to resolve an authentication issue.

The tracked migrations create/configure three buckets:

| Bucket | Visibility | Access |
| --- | --- | --- |
| prescriptions | Private | Auth UUID folder plus matching object owner; PNG/JPEG uploads disallowed; PDF only, 10 MB limit |
| signatures | Private | Exact Auth UUID/signature.png path plus object owner; PNG/JPEG only, 1 MB |
| logos | Public branding on creation; preserves any stricter existing visibility | Auth UUID folder and owner for writes; PNG/JPEG only, 1 MB |

Restrictive guards prevent old permissive object policies bypassing ownership, and prevent browser roles changing these bucket settings. Supabase's Storage service sets owner_id from the signed JWT. Existing legacy CUID logo files remain public if the logos bucket was public; new uploads use Auth UUID paths. Legacy prescription CUID objects stay quarantined; the authenticated route regenerates documents without deleting history.

The PDF endpoint verifies the doctor, Rx, patient and visit ownership, generates the requested A4/A5 PDF, uploads into the private bucket and redirects to a **60-second signed URL**. Signed URLs are bearer credentials valid during that window: do not share/log them. They are never stored in Prescription.pdfUrl. If Storage upload/signing is unavailable, the endpoint directly streams the authorized document. Responses/redirects use private, no-store. Signing is documented by [Supabase](https://supabase.com/docs/reference/javascript/storage-from-createsignedurl). Opening the Rx again obtains a fresh link; downloaded/printed copies cannot be revoked by URL expiry.

## HUMAN: hosted deployment and verification

Local code/type/build/SQL tests pass. This does not apply policies to the hosted project. Stop here for the project owner to:

1. Back up and follow DB_NOTES.md's baseline procedure; use valid existing credentials without committing them. Apply tracked migrations with `npx prisma migrate deploy`, using a Supabase migration/admin role. Never reset clinic data. Storage DDL may require the SQL Editor's administrative context. If a migration fails, investigate privileges and use Prisma's documented failed-migration workflow; do not mark unapplied security SQL as applied.
2. Supabase Storage: verify prescriptions and signatures are private, file limits/MIME types are correct, and the restrictive policies are present. If deploying to plain Postgres the Storage migration blocks are skipped; create/configure the real Supabase service before clinical use. Disable unused Data API exposure and inspect Security Advisor.
3. Redeploy the app only after schema migrations. Use synthetic records for doctor A, doctor B and logged-out tests: A opens A's Rx, B cannot open A's route or sign/download/list A's object. Direct `/storage/v1/object/public/prescriptions/...` requests must fail. A's signed URL should work initially and stop returning bytes after expiry (allow for clock skew). Test new signature/logo upload, preview and both print sizes.
4. Test previously published public Rx links and investigate/purge caches as necessary. Privacy changes cannot retract downloads. Verify expiry and public-link rejection against the hosted service/CDN, not only local SQL.

No dashboard setting, hosted data, environment file or remote Git branch was changed in this task batch. Local tests use synthetic roles/objects and mock the signed URL endpoint; they cannot certify hosted expiry, JWT handling or cache behaviour.

Verification: `node scripts/check-database-isolation.mjs`, `node scripts/check-prescription-storage.mjs`, `node scripts/check-storage-config.mjs`, `node scripts/check-pdf-security.cjs`, `node scripts/check-drafts.cjs`, TypeScript and production build.
