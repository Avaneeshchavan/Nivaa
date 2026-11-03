# Task 3.2 — doctor admission

This is the admission setup for task 3.2, not the full task 4.1 deployment runbook.

## App-side implementation

Configure the **server-only** `ALLOWED_DOCTOR_EMAILS` variable as exactly two different comma-separated email addresses. Matching trims whitespace and ignores case; aliases are not inferred. Missing, invalid, duplicate or extra entries deny access to everyone. Do not prefix the variable with NEXT_PUBLIC_. No environment file was edited by this task.

The login Server Action checks the allowlist before calling Supabase and returns a generic failure. It admits only a verified Supabase user with confirmed email and a provisioned Doctor row whose email matches that identity. Rejected provisioned sessions are signed out. Middleware also checks the confirmed identity/allowlist; every record action/API still calls getCurrentDoctor independently. Dashboard/root redirects require the Doctor gate. Patient search strings are removed from login redirects.

## HUMAN — stop here before considering 3.2 complete

1. Choose the two actual doctor email addresses. In Vercel project Settings → Environment Variables, set ALLOWED_DOCTOR_EMAILS for the intended environment, then redeploy when ready. For local operation, supply it through the launching shell/process environment. Keep credentials private. The app will deny access until this is configured correctly.
2. Open Supabase → Authentication → Sign In / Providers. Turn **Allow new users to sign up** OFF and save. Keep only the sign-in methods the clinic needs; disable anonymous sign-ins. Under the Email provider, verify Confirm Email is enabled. See [Supabase's configuration reference](https://supabase.com/docs/guides/auth/general-configuration).
3. Under Authentication → Users, inspect the accounts. Provision/confirm only the two approved doctors through the trusted admin/invitation workflow, and verify each existing Doctor.supabaseId and Doctor.email mapping. Do not automatically create Doctor rows from public signups. Review any other existing accounts and revoke/remove unauthorized access through the dashboard; disabling signup does not disable existing accounts.
4. Review direct Storage access too. The app allowlist does not change Supabase JWT admission or the existing owner-based Storage policies: an already signed-in identity outside the app allowlist can still use its own UUID's objects directly while its token remains valid. Session revocation alone does not immediately invalidate all issued access JWTs. Resolve unwanted identities/policies and account for token expiry before declaring access removed. Existing signed download links remain bearer credentials until their short expiry.
5. Test with synthetic data: both approved doctors can sign in and access their own records; wrong password, an unapproved identity, unconfirmed email and missing/mismatched Doctor rows cannot access patient pages, direct APIs or Server Actions. Verify direct Supabase signup is disabled and third-party identities cannot obtain unwanted Storage access. Test the real hosted session flow; local mocks cannot certify dashboard settings.

Task 3.2 remains unchecked until these HUMAN actions are completed and confirmed. Tasks 3.3–3.5 were not started in this batch. Previous HUMAN migration/Storage checks in docs/STORAGE_SECURITY.md also remain prerequisites for clinical use.

## Local verification

`node scripts/check-doctor-access.cjs` tests malformed/missing allowlists, both approved identities, third-party/unconfirmed users, matching Doctor rows, login failures and rejected-session cleanup using synthetic mocks. TypeScript and production build are required separately. No live accounts, settings or data were changed.
