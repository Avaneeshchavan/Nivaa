# Backup and recovery

## Current state

Backup/export tooling is implemented and encryption round-trip, tamper detection, wrong-password rejection and file-permission checks pass with synthetic data. A full clinic backup and isolated restore drill remain pending. This machine has no PostgreSQL client tools on PATH. The configured app variables provide no Storage service-role credential or owner-held backup passphrase.

The export covers the public application schema, tracked migrations, and the prescriptions, prescription-notes, signatures and logos buckets. Auth account recovery and project settings need an owner-managed recovery procedure. A database dump contains Storage metadata only, so image bytes must be exported separately. [Supabase backup scope](https://supabase.com/docs/guides/platform/backups)

## One-time owner setup

1. Install PostgreSQL client tools of the same major version as the hosted database, or newer. On macOS, install Homebrew's `libpq` package and add its `bin` directory to PATH. Confirm `pg_dump --version` and `pg_restore --version` work. Check the hosted server version in Supabase Database settings before selecting a client version.
2. In a password manager, generate and retain a backup passphrase of at least 20 characters. Store it independently of the backup files. Losing it prevents recovery.
3. In Supabase Project Settings → API Keys, retrieve the existing server-side service-role key for local backup use. Keep it in the password manager. Keep this credential out of Vercel's public variables and out of Git. It grants privileged project access.
4. Select a private backup folder on an encrypted disk and a second encrypted off-device destination. Set `NIVAA_BACKUP_DIR` to that folder. The script defaults to the ignored `backups/` folder with restrictive file permissions.
5. Supply `NIVAA_BACKUP_PASSPHRASE` and `SUPABASE_SERVICE_ROLE_KEY` through the launching environment or a password-manager secret runner. The script reads the existing app database variables without editing environment files.

For an interactive zsh session, these prompts keep secrets out of shell history and command arguments.

```zsh
read -s 'NIVAA_BACKUP_PASSPHRASE?Backup passphrase: '
echo
export NIVAA_BACKUP_PASSPHRASE
read -s 'SUPABASE_SERVICE_ROLE_KEY?Supabase service-role key: '
echo
export SUPABASE_SERVICE_ROLE_KEY
./scripts/backup.sh
unset NIVAA_BACKUP_PASSPHRASE SUPABASE_SERVICE_ROLE_KEY
```

The tool uses certificate-verified PostgreSQL TLS, a custom-format `pg_dump`, `pg_restore --list` validation, paginated Storage exports, and AES-256-GCM encryption with a fresh salt/IV and PBKDF2-SHA256 key derivation. Temporary plaintext files have owner-only access and are removed on normal success/failure. Restrict access to the machine during backup and inspect private temporary folders after a process or machine crash.

`./scripts/backup.sh --database-only` explicitly creates a partial backup when Storage export is unavailable. Its filename and manifest identify it as database-only. A complete restoration of handwritten photos requires a full archive.

## Weekly procedure

Run a full backup after clinic closing when record and branding changes have stopped. Record the date, success, archive checksum and completion of the off-device copy in an owner-held operations log. Keep multiple dated copies so a recent corrupt or mistaken edit does not replace the last good version. Verify the encrypted file exists and copy it to the second private destination. Keep the passphrase separately.

Scheduling is pending the owner's backup destination, secret-storage choice and a successful restore drill. Weekly export can lose up to a week's work after a total failure. Choose a more frequent schedule if that recovery window is unacceptable for the clinic. The audit table is append-only and should be included in backups and capacity monitoring.

## Isolated restore drill

1. Create a separate Supabase recovery/test project and use synthetic records for the first drill. Use its credentials only in the recovery process. Confirm the project reference differs from production.
2. In a private folder on an encrypted disk, authenticate and decrypt one archive. The output path must be new.

```sh
./scripts/backup.sh --decrypt /private/path/backup.nivaa /private/path/restore.tar
```

3. Extract the authenticated archive with `tar -xf /private/path/restore.tar -C /private/path/new-empty-folder`. Inspect `manifest.json`. A `databaseOnly` value of false identifies an export that also contains Storage bytes.
4. Install the repository version corresponding to the backup. Apply the archived tracked migrations to the empty recovery project with the verified migration helper. Supabase manages its own Auth/Storage schemas. Create a restore list with `pg_restore --list database.dump`, exclude its `TABLE DATA public _prisma_migrations` entry, and restore application rows with `pg_restore --data-only --no-owner --no-acl --use-list restore.list` against the isolated target. Preserve the new project’s migration history. Supply connection credentials through PostgreSQL environment variables. Stop on errors and investigate before retrying.
5. Recreate or recover the two approved Auth identities through Supabase's trusted account workflow. Reconcile Doctor.supabaseId values with recovered Auth UUIDs. Each private object's UUID folder and owner_id must match that same Auth identity. Upload Storage bytes through authenticated doctor sessions, or have the migration administrator explicitly reconcile owner metadata after a service-role restore. The service-role key alone does not establish doctor ownership of restored objects.
6. Sign in as both doctors. Confirm patient counts, an old and new prescription, medicine search, draft restoration, an attached paper photo, branding/signature and A4/A5 printing. Confirm cross-doctor requests and anonymous requests are denied. Verify the audit trail and disabled-doctor Storage denial. Keep the drill results and recovery duration in the operations log.
7. Remove decrypted working copies through the encrypted disk's normal retention procedure after the drill. Keep encrypted archives according to the clinic's retention policy.

A successful archive encryption test establishes the file format's behavior. A completed isolated restore establishes recoverability for the clinic. The latter remains an explicit release/operations gap in the security review.

## Free-tier availability

Supabase may pause Free projects after low activity over seven days. Check the project's pause-warning email recipient and review the dashboard before reopening after a holiday. Resume a paused project from the Supabase project dashboard and rerun the smoke/availability checks. [Supabase production checklist](https://supabase.com/docs/guides/deployment/going-into-prod)

Run `node scripts/check-availability.mjs` from a trusted machine to check a certificate-verified `SELECT 1` and the Auth settings endpoint without querying patient records. It can be scheduled daily by the owner after agreeing on a trusted machine and secret storage. A keep-alive check has no uptime guarantee. During an outage, use the clinic's paper process and reconcile records after recovery. A paid plan decision belongs to the owner.
