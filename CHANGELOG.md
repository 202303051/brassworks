# Changelog

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
