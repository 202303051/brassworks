# Account access and full regression — 0.4.0

Executed on 12 November 2026. All previous phase tests are retained and included in the final main-branch regression suite.

- Source lint/format checks and **all 87 automated tests passed**, with zero failures or skipped tests. This includes the previous 76 tests plus account-policy and invitation-handler cases. Coverage of imported modules was 91.42% lines, 98.02% branches and 97.26% functions; these numbers do not represent full React UI coverage.
- Production build passed and dependency audit reported **zero known vulnerabilities**.
- All four migrations applied in the disposable PostgreSQL cluster. **365 SQL assertions** passed (345 foundation assertions plus 20 account-access assertions), along with both genuine stock/user-capacity concurrency cases. The cluster was stopped and removed.
- **All 28 existing factory browser scenarios and seven OCR/layout scenarios passed** on the final built app, preserving local CRUD, stock integrity, exports, offline saves, responsive layouts and real on-device report recognition.
- **All 12 authentication browser scenarios passed** using the actual Supabase SDK, a separate local Vite process, fake users and intercepted Auth responses. They cover protected deep links/public privacy, reset membership privacy, rejected credentials, department/viewer restrictions, ignored forged role metadata, access revocation, Admin TOTP enrollment and readable QR, wrong-code rejection, invitations and confirmed team updates, global logout, invite/recovery token callbacks, PKCE reset callbacks, idle expiry and failed profile verification. No uncaught page errors or unexpected external requests occurred.
- The account browser suite now runs in both Windows and Linux CI alongside every earlier suite. Hosted results are reported only after the main-branch workflow finishes.

The owner has no Supabase project and requested keeping the local demo. No hosted project, real account, email, live JWT or real TOTP verification is claimed. The server function and staging settings still need deployment/verification against that future project. Factory records remain browser-local and shared-data integration has not started. See [account setup](account-setup.md).

## Unified app and hosted check fix — 0.3.6

All completed features now share the same Home, Furnace and Production interface. Phase banners and the build guide were removed from the app; old guide URLs redirect to Home. The existing browser database name is retained so updates preserve saved records.

The unified app passed all 76 automated checks, the production build, all 28 factory browser scenarios and all seven real-OCR/layout browser checks. The dependency audit reported zero vulnerabilities, and the Phase 2 database rerun passed 345 SQL assertions plus two concurrent-write cases.

The first newly published main run exposed a Linux CI harness issue: the normal browser suite used preinstalled Chrome, but the following OCR suite tried a missing Playwright browser executable. The job log confirmed `Executable doesn't exist` for the Chromium headless-shell cache path. The OCR runner now also finds preinstalled Linux Chrome. Matrix fail-fast is disabled so one platform's failure cannot cancel checks on the other platform. The database jobs in that run passed on both Windows and Linux. GitHub Actions remains the authoritative source for the subsequent hosted run's result.

## Phase 2 database verified locally — 0.3.5

Executed on 12 November 2026 using the checksum-verified PostgreSQL 17.11 Windows binaries downloaded from EDB, fake data and a fresh password-protected loopback-only cluster.

- All three migrations and the staging seed applied successfully.
- **345 SQL assertions passed**, including constraints, stock/relationship invariants, row-level-security roles, metadata, audit immutability, soft deletion and user capacity.
- **Both real concurrent-write cases passed:** only one activation took the twentieth user slot, and only one production entry consumed the final billet. Final counters and visible records matched expectations.
- The runner stopped its temporary PostgreSQL server and removed only its marked test directory. A subsequent process check found no remaining test PostgreSQL processes.
- Source lint/format checks, all 76 model/parser/security tests and the production build also passed. Application code is unchanged by this update; the 28 factory and 7 photo/layout browser scenarios passed for the immediately preceding version.
- The first Windows execution reproduced a test-harness startup timeout: the detached postmaster inherited captured process pipes. Giving `pg_ctl` ignored standard streams fixed the issue. The failed run cleaned its cluster, and the corrected full run passed. Disposable initialization also skips its unnecessary disk-sync step.
- The common SQL suite now serves both the native Windows and existing Docker backends. Windows database CI is configured; hosted CI results require a successful GitHub push and are not claimed here.

This verifies the Phase 2 database foundation on this PC. It does not connect the web UI to shared data, provision hosted Supabase, verify real Auth/JWT/email/MFA, or start Phase 3. The browser demo, spectro photo reader and local launchers remain available.

## Furnace layout and spectro photo scan — 0.3.4

Executed on 12 November 2026 using fake records and a synthetic printed report image. This completes the requested furnace/demo improvements; no authentication or later phase was started.

- All 76 automated model, parser, date and source-security tests passed, along with source lint and formatting. The covered modules reached 89.43% lines, 97.33% branches and 96.77% functions. This is not full-application coverage; the asynchronous OCR flow is exercised separately in the browser.
- The production build passed. The existing large-main-bundle warning remains. OCR code/model assets are local and loaded only when scanning, rather than added to the initial app bundle.
- All 28 existing factory browser scenarios passed after the layout changes. No uncaught page errors were reported.
- All seven dedicated photo/layout browser checks passed. Real OCR read Cu 58.20%, Zn 39.00%, Pb 2.50%, Fe 0.10% and Sn 0.20% from a synthetic PNG. The checks verify reviewed application, blocking totals above 100%, saving the heat over the PC's LAN HTTP address, unsupported-image/cancellation handling and no external requests or HTTP photo uploads.
- Furnace lists/forms were checked at 360, 768 and 1440 px with no horizontal page overflow. Visual mobile review confirmed paired metrics, compact controls and organized material/chemistry details.
- Images remain transient browser objects; they are not uploaded or attached to saved heat records. Missing/conflicting/bounded readings are not guessed. A detected Zn value switches that form to manual Zn; unchecked fields retain their values.
- No real spectrometer photo or physical phone was supplied for accuracy testing. Blurred photos, unusual report formats and multiple measurement rows may require manual correction. Every detected reading must be reviewed. This is React web, not an Expo Go/native binary.
- SQL/database tests were not rerun because Docker is absent on this PC; the schema was unchanged. Authentication, cloud sharing, releases and native builds remain later work.

## Phone preview follow-up — 0.3.2

Two regression tests cover secure UUID generation on local HTTP connections that omit `crypto.randomUUID`: the fallback sets the UUID version/variant bits, generates distinct IDs and rejects unavailable secure randomness. All 66 automated checks passed. The LAN browser run verified heat/receipt/plan/output creation and stock operations; a later development hot reload interrupted the long run, so its partial execution is not reported as a full pass. Final built-app regression results are recorded with the subsequent UI/photo-scanning version.

## Windows local setup — 0.3.1

Executed on 12 November 2026 on the Windows PC, using the project-local Node 24.22.1 runtime and fake browser records.

- The Node/npm archive was downloaded from nodejs.org and checked against the official SHA-256 manifest before extraction. Locked dependency installation completed; its audit reported zero vulnerabilities.
- `npm run check` passed: lint, source formatting and all 64 tests, with 100% lines, 98.72% branches and 98% functions for the covered business modules.
- The production build passed. The existing warning about the main bundle exceeding 500 kB remains.
- All 28 browser scenarios passed with installed Chrome and no uncaught page errors. These use isolated storage and do not overwrite the user's browser records.
- The local development server returned HTTP 200 and the running factory home screen was verified at `http://localhost:5173`.
- The separate phone-browser preview returned HTTP 200 on the PC's private Wi-Fi address at port 5174. A QR image was generated locally; physical-phone connectivity still depends on the same Wi-Fi and Windows Firewall. No physical-device pass is claimed.
- The Windows changes fix `npm.cmd` spawning in the check runner, make the ignore-rule assertion accept CRLF, and use LF source checkouts for consistent formatting. Browser tests now find installed Chrome/Edge on Windows. CI also includes a Windows job; remote results must be checked after pushing.
- `npm run test:database` was attempted and could not start because Docker is absent (`spawnSync docker ENOENT`). SQL and concurrency tests were **not rerun on this PC**. The unchanged Phase 2 SQL source and earlier execution evidence are recorded below. Docker/WSL are not required to run the current browser-local app.

All completed phases now belong on `main`, retaining their individual historical commits. The Windows setup update is a separate follow-up commit. Authentication and shared cloud data are still future phases, continued one at a time at the owner's request.

## Phase 2 validation — 0.3.0

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

Two low-severity test-tooling findings were reproduced in CI and corrected. P2-T001: colored Vite output prevented URL matching; the browser runner now removes terminal control sequences and is retested with forced color. P2-T002: PostgreSQL's temporary initialization socket accepted connections before the test database existed; readiness now requires an actual query over container-local TCP, which only the final server accepts. Both corrected runners are executed again locally and in CI. The application/database tests are retained.

## Defensive checks actually executed

The SQL role matrix tests all five application roles against all ten public tables, including read/update boundaries and denied hard deletion. Additional checks cover inactive, unverified, banned, deleted and missing identities; Admin without AAL2; self-role escalation; audit forging/mutation; metadata spoofing; private counter access; invalid master types; soft-deleted visibility and restore; malformed labels; literal SQL text; Unicode; invalid dates, weights, chemistry and Hollow dimensions; linked record deletion; overconsumption; receipt changes and output group moves.

Browser checks cover literal XSS text, escaped CSV formulas, overconsumption, simultaneous tab saves, stale edits, duplicate submissions, editing/deleting production, filtered CSV/print, persistence, already-loaded offline saving, keyboard navigation, responsive lists/forms and themes. They use browser viewports, not physical-phone tests.

An independent static SQL review found no concrete privilege bypass in the reviewed functions/policies. This is scoped evidence, not a guarantee of complete security.

## Source and limits

Source: [v0.3.0](https://github.com/202303051/brassworks/tree/v0.3.0). Version commands are in [versioning](versioning.md). The [GitHub Actions page](https://github.com/202303051/brassworks/actions) and pull requests contain authoritative remote check and merge state; local results above do not by themselves imply a hosted CI run passed.

No hosted Supabase project has been provisioned, altered or connected. The local shim does not verify real Auth email, signed JWT validation, PostgREST/gateway settings, hosted backups or MFA enrollment. Those require the separate staging setup and later authentication/data phases. The application remains a no-login browser-local demo until then.

No physical Android/iOS device, Expo Go, native binary, app-package security, OTA update, production load, hosted security headers or backup-restore test was executed in this phase. Cold-start offline/PWA is not delivered. The original private brief, previous internal reports, local credentials and environment values are excluded from the public repository.

Phase 2 stops at this database/standalone foundation. Phase 3 authentication starts only after the user's next-phase instruction.
