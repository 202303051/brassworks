# Factory account setup — Phase 3

Version 0.4.0 adds account access in the same app. The owner has no Supabase project yet, so both public settings remain empty and the current local demo stays available. No hosted resources, users, real invitations or production data have been created by this delivery.

## What is implemented

- Email/password sign-in for invited users; no public signup, anonymous cloud login or client-selected roles.
- Invitation and recovery callbacks, password setup/change, generic reset responses and local/global sign-out.
- Server-verified active profiles, administrator TOTP enrollment/challenge and department write controls.
- Team invitation, confirmed role/activation changes and stale-update detection. An Admin cannot change their own role/active/deleted state through the app or API.
- A server-only invitation function that authenticates the caller with Auth, requires Admin `aal2` through caller-scoped database policies, checks capacity and writes the profile as that Admin for audit attribution.
- Tab-scoped SDK session storage; 30-minute idle and eight-hour absolute browser deadlines. Access is checked at sign-in, focus/visibility and every minute while active. Server policies immediately reject inactive/banned/deleted profiles; UI revalidation can take up to a minute while focused.

Authentication event history is provided by [Supabase Auth audit logs](https://supabase.com/docs/guides/auth/audit-logs). Verify sign-in, password changes and sign-out events plus the chosen retention/storage settings on staging. Factory profile/role changes remain in the separate immutable application audit table.

These browser deadlines improve shared-device use; they are not server-enforced session limits. Configure supported Auth server time-box/inactivity controls separately when deploying. Sign-out revokes refresh tokens; already-issued access JWTs can remain valid until expiry. Existing SQL policies still enforce the current profile and signed MFA assurance on every request.

## Activate on a separate staging project

1. Follow [database setup](database-setup.md), applying **all four** numbered migrations in order. Existing Phase 2 installations apply only the new `004_account_access.sql`. Never apply the disposable Auth shim or test fixtures to staging/production.
2. In Supabase Auth, disable new public signups, enable email confirmation, set minimum password length to at least 12 and enable TOTP enrollment/verification. Configure your mail provider and rate limits. `supabase/config.toml` records the matching local defaults; it does not change hosted settings automatically.
3. Bootstrap the first verified, active Admin through the trusted project dashboard/SQL as described in database setup. Do not give a public client a privileged key or spoof an MFA claim. The app's narrow `get_my_access()` RPC reveals only the caller's own active verified profile before MFA, allowing an Admin to reach enrollment while ordinary table access remains denied until `aal2`.
4. Set the Auth Site URL and exact allowed redirect URLs to owned HTTPS app origins plus `/account` (or `http://localhost:5173/account` for this PC). Avoid wildcards. Invitation callbacks support opening an email on another device. PKCE password reset links should be opened in the browser that requested the reset. Use HTTPS for real account access on a phone; the existing HTTP LAN preview is for the unconnected demo.
5. Deploy `supabase/functions/invite-user` with the Supabase CLI or dashboard. Its entry point pins the official SDK and reads the platform's `SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` **only on the server**. Set its `APP_ORIGINS` secret to a comma-separated list of exact owned origins, e.g. `http://localhost:5173,https://your-owned-host.example`. The handler rejects all other origins. The config disables the gateway's legacy JWT precheck because the handler independently validates the bearer via Auth and caller-scoped RLS; do not remove those checks.
6. Copy `.env.example` to ignored `.env.local`, then set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` from that staging project. Only a publishable or legacy `anon` key belongs here. Vite bundles these public values; never use a secret/service-role key. Missing one setting or invalid settings fail closed instead of opening the demo. Leave **both** empty to stay in the local demo. Restart the local launcher after changing settings.
7. Sign in as the initial Admin, scan the authenticator QR, verify a code and invite a fake staging colleague from Account → Manage team access. The database's 20-active-profile cap is authoritative, including concurrent invites/activations. Invitations reserve a place before email verification. Role/activation changes are audited database updates. Deactivation preserves records and history; later activation restores access for the same identity.

If Auth sends an invitation but the following profile insert fails (for example, a concurrent invite uses the last place), the recipient gets **no factory access** without a valid active profile. The function does not delete Auth identities automatically, because the identity might be an existing pending invitation. Review the incomplete account in the trusted dashboard and finish or remove it before retrying. The administrator should inspect function responses/logs through trusted project tools; no credentials or tokens should be logged.

Authenticator keys and QR images are displayed only during setup, never saved in factory records or application logs. The app does not generate MFA recovery codes. The project owner must establish a verified administrator recovery procedure before production; Supabase supports multiple factors, but this UI enrolls the required initial TOTP factor only.

## Data and validation boundaries

Factory heats, billets, plans, outputs and added master options **still use the existing browser-local demo database**. Signing in does not migrate, isolate by user or synchronize those records. Use fake records on shared browsers; cloud factory data is Phase 4. The existing IndexedDB name is intentionally retained to preserve saved demo records.

`npm run test:auth` runs the actual SDK against a local mock Auth transport and fake accounts. It verifies forms, callbacks, route/role gates, TOTP UI, invitations, access changes and expiry without sending mail. The disposable PostgreSQL suite separately verifies signed-claim policy behavior with its local shim. Neither proves real hosted JWT validation, SMTP delivery, TOTP cryptography, deployment configuration or production recovery. Complete those staging checks after provisioning the project.

Official API references: [password recovery](https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail), [MFA enrollment](https://supabase.com/docs/reference/javascript/auth-mfa-enroll), [invitation API](https://supabase.com/docs/reference/javascript/auth-admin-inviteuserbyemail), [sign-out scope](https://supabase.com/docs/reference/javascript/auth-signout) and [Edge Function authentication](https://supabase.com/docs/guides/functions/auth).
