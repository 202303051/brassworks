# Phase 2 validation — 0.3.0

Executed 11 November 2026 against the owned local application and disposable PostgreSQL database, using fake records. The current application runs independently of Apper; its ChatGPT connection was successfully uninstalled at the owner's request.

## Scope and tests

- Source lint and formatting passed across the standalone app.
- 64 automated model, calculation, date and source-security checks passed. Imported business-logic coverage: 100% lines, 98.72% branches, 98% functions. These percentages do not cover all UI or SQL code.
- Production build passed. One bundle-size warning remains; it does not prevent the build or the tested workflows. The former platform configuration warning is removed.
- 28 browser scenarios passed against the built standalone app, with zero uncaught page errors and zero external requests. These include the previous 27 workflow scenarios and an external-service independence check. The built-preview test runner also completed the same 28 scenarios; these are repeat executions, not additional unique tests.
- The dependency audit reports zero findings at every severity, including development dependencies.
- All three migrations, the fake seed and 345 SQL assertions passed in PostgreSQL 17. The SQL suite exercises constraints, RLS roles, metadata, audit, soft deletion, stock adjustments and user capacity. The test runner reports its exact completed assertion count and fails on any SQL error.
- Two genuinely concurrent transaction scenarios passed: only one of two users could take the twentieth active slot, and only one of two production entries could consume the last billet. Final counters and visible records were checked after both transactions completed.
- Local development server responds at `http://localhost:5173`; no environment file, platform SDK or login is required for the browser demo.

Reproduce with:

```sh
npm ci
npm run check
npm audit --audit-level=high
npm run build
npx playwright install chromium
npm run test:browser
npm run test:database
```

The database command always creates and removes its own isolated container. It does not accept a database URL. The browser command starts its own built preview and uses isolated browser storage. Use `CHROMIUM_PATH` for a preinstalled Chromium executable.

## Findings and fixes

| ID      | Severity / type       | Location and reproduction                                                                                               | Root cause and fix                                                                                                                                                                                                               | Regression evidence                                                                                                                                     |
| ------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P2-F001 | Medium / functional   | `003_row_level_security.sql`: a Manager updating an output's `deleted_at` was rejected in the first actual SQL run.     | The updated row becomes invisible under its SELECT policy. Added `soft_delete_record(text, uuid)` with an exact table allow-list, verified role checks, row locking and parameterized identifiers/IDs; kept deleted rows hidden. | Direct update rejection, authorized RPC deletion, repeat deletion, forbidden role/table calls, Admin restore and restored stock are executed SQL tests. |
| P2-S001 | Low / hardening       | `001_factory_schema.sql`: review found private counter tables had no RLS, although clients already had no table grants. | Enabled and forced RLS on both counter tables. No client bypass was observed before the change.                                                                                                                                  | SQL assertions verify both flags; direct client reads/writes are denied.                                                                                |
| P2-S002 | Moderate / dependency | The newly pinned local lint tooling initially reported vulnerable development-chain minimatch entries.                  | Pinned the minimatch override to 11.0.1 and regenerated the lockfile.                                                                                                                                                            | Full dependency audit reports zero findings; source checks pass.                                                                                        |
| P2-F002 | Low / UI              | The explicit icon registry exposed a missing `Github` export in the installed icon version.                             | Replaced it with a supported code icon; removed the giant dynamic namespace.                                                                                                                                                     | Standalone build and all browser workflows pass.                                                                                                        |

The soft-delete failure was actually reproduced before its fix. The other findings were review, build or dependency-tool findings; they are not claims of successful attacks against a deployed service.

## Defensive checks actually executed

The SQL role matrix tests all five application roles against all ten public tables, including read/update boundaries and denied hard deletion. Additional checks cover inactive, unverified, banned, deleted and missing identities; Admin without AAL2; self-role escalation; audit forging/mutation; metadata spoofing; private counter access; invalid master types; soft-deleted visibility and restore; malformed labels; literal SQL text; Unicode; invalid dates, weights, chemistry and Hollow dimensions; linked record deletion; overconsumption; receipt changes and output group moves.

Browser checks cover literal XSS text, escaped CSV formulas, overconsumption, simultaneous tab saves, stale edits, duplicate submissions, editing/deleting production, filtered CSV/print, persistence, already-loaded offline saving, keyboard navigation, responsive lists/forms and themes. They use browser viewports, not physical-phone tests.

An independent static SQL review found no concrete privilege bypass in the reviewed functions/policies. This is scoped evidence, not a guarantee of complete security.

## Source and limits

Source: [v0.3.0](https://github.com/202303051/brassworks/tree/v0.3.0). Version commands are in [versioning](versioning.md). The [GitHub Actions page](https://github.com/202303051/brassworks/actions) and pull requests contain authoritative remote check and merge state; local results above do not by themselves imply a hosted CI run passed.

No hosted Supabase project has been provisioned, altered or connected. The local shim does not verify real Auth email, signed JWT validation, PostgREST/gateway settings, hosted backups or MFA enrollment. Those require the separate staging setup and later authentication/data phases. The application remains a no-login browser-local demo until then.

No physical Android/iOS device, Expo Go, native binary, app-package security, OTA update, production load, hosted security headers or backup-restore test was executed in this phase. Cold-start offline/PWA is not delivered. The original private brief, previous internal reports, local credentials and environment values are excluded from the public repository.

Phase 2 stops at this database/standalone foundation. Phase 3 authentication starts only after the user's next-phase instruction.
