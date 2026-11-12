# Changelog

## 0.4.0 — Phase 3 account access

- Add invite-only Supabase sign-in, invitation/password-recovery callbacks and password changes inside the existing interface.
- Require verified active profiles and administrator TOTP MFA; preserve database enforcement of roles and the 20-active-user cap.
- Add administrator team invitations, confirmed role/activation changes, stale-update checks and protection against changing one's own access.
- Keep public credentials separate from the server-only invitation function. Reject partial/secret browser configuration and require HTTPS or localhost for sign-in.
- Store sessions in tab storage with idle/absolute browser deadlines, periodic/focus revalidation and local/global sign-out.
- Preserve the no-login local demo, existing browser records and on-device spectro scanning when no account project is configured.
- Add account-policy, invitation-handler, SQL and real-SDK browser coverage. Hosted email delivery, real TOTP and production deployment require the owner's future Supabase project; shared factory data remains Phase 4.

## 0.3.6 — One factory interface

- Show all completed workflows together through Home, Furnace and Production navigation.
- Remove phase banners and the build-phase guide from the app; redirect old guide bookmarks to Home.
- Keep development phases in technical documentation and separate commits on main.
- Preserve existing browser data and make photo-assisted spectro entry visible in the Home description.
- Reuse preinstalled Linux Chrome in the dedicated OCR browser checks, matching the factory browser runner's CI setup.
- Let Windows and Linux CI jobs finish independently so one failure does not cancel the other platform's checks.

## 0.3.5 — Phase 2 local database checks

- Install checksum-verified PostgreSQL 17.11 test tools inside the Windows project, with resumable downloads.
- Add a disposable, password-protected loopback database backend and keep Docker as an alternative.
- Run both backends through the same migration, role/constraint, audit and concurrent-write suite.
- Guard cleanup by resolved test-directory path and a per-run ownership marker; stop the temporary server before removal.
- Add Windows database CI coverage and update local setup instructions. Authentication and shared application data remain later phases.

## 0.3.4 — Spectro photo reader

- Add camera/photo upload to the furnace spectro panel, with on-device OCR for Cu, Zn, Pb, Fe and Sn.
- Require review before applying readings. Detect conflicts, missing values, limits, unit conversion and totals; preserve unchecked/manual fields.
- Package the OCR worker, engine and recognition model locally. No photo upload or external AI account is required.
- Add real-image browser checks, parser regression cases and responsive furnace checks. Native Expo delivery remains outside this React web version.

## 0.3.3 — Organized furnace workspace

- Use compact three-column summaries, paired filters and a smaller furnace heading/action area.
- Organize heat cards with clear identity/status, paired charge/melting metrics and a single action row; use two card columns on wide screens.
- Keep material and chemistry breakdowns expandable, with accessible labels for icon actions.
- Group heat entry fields in a compact grid and place charge/spectro panels side by side on desktop, retaining 48 px controls.

## 0.3.2 — Phone browser record creation

- Generate secure version-4 UUIDs with `crypto.getRandomValues` when a phone's local HTTP connection does not expose `crypto.randomUUID`.
- Keep unsupported browsers from falling back to insecure random IDs.
- Add fallback/uniqueness regression tests and allow browser tests against this PC's own LAN address while still blocking other origins.

## 0.3.1 — Windows local setup

- Put the completed Phase 0–2 history on `main`; use a separate commit for each future phase, one phase at a time.
- Add a checksum-verified, project-local Node 24/npm installer and Windows app/terminal launchers.
- Add a separate phone-browser preview launcher bound to the PC's private IPv4 address; this web version is not an Expo Go build.
- Run lint and format CLIs directly with Node so `npm run check` works on Windows without spawning `npm.cmd`.
- Normalize source line endings and make the ignore-rule test accept Windows line endings.
- Preserve every existing factory workflow and browser-local data. Authentication remains Phase 3.

## 0.3.0 — Database and standalone application

- Remove the Apper connection, runtime SDK/CDN, template authentication and unused store/components; run directly with Vite.
- Preserve all four factory demo workflows and the existing local data storage structure.
- Replace the full icon namespace with an explicit icon registry and use system fonts without external requests.
- Add PostgreSQL/Supabase schema migrations, stock views, transaction-safe stock/user-cap triggers, audit and role policies.
- Add realistic staging seed data, isolated SQL/concurrency tests and public database setup/design guides.
- Pin application/tool dependencies, add repeatable local/CI checks and fix the minimatch development advisory.
- Keep authentication and shared UI/database connection for Phases 3 and 4.

The app is still a browser-local web demo. This version does not provision a hosted database or deliver native mobile binaries. See docs/validation.md for actual checks and deployment evidence.

## 0.2.0 — Phase 1 factory demo

- Implement all four factory sections with complete record workflows.
- Add local transactional persistence and cross-tab stock consistency.
- Add validated furnace timing, charge, chemistry, billet stock and recovery calculations.
- Add smart master selections, date/search filters, sorting, pagination, CSV and print/PDF.
- Add status cycling, duplicate-heat confirmation, linked-record deletion guards and stale-edit protection.
- Add repeatable business/source tests, browser scenarios, a lockfile and web CI checks.
- Update the validation dependency to a patched pinned version.

Cloud sharing, production authentication and native builds remain future work.

## 0.1.0 — Apper web scaffold

- Add the initial responsive shell, department briefs, privacy note and IST clock.
- Add the GitHub source repository, CI foundation and review ownership.
