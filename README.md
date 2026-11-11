# Brassworks

A standalone brass-factory web application. Version **0.3.0** adds the Phase 2 PostgreSQL database foundation. The factory screens remain a browser-local demo until the authentication and data-connection phases.

## Run locally

Install Node 24 LTS, then run:

```sh
npm ci
npm run dev
```

Open the localhost URL printed by Vite. No environment file, builder account or plugin is needed. Source edits use Vite Fast Refresh. The app uses system fonts and makes no requests to a builder SDK or hosted font service.

## Factory workflows

- Furnace heats, overnight melting time, multi-row charges and spectro with automatic/manual zinc balance.
- Billet receipts and available stock grouped by company, grade and size.
- Round, Hexa, Octa and Hollow rod plans, dimensions, priorities and status transitions.
- Finished production with linked/manual orders, matching billet consumption, scrap and recovery.
- Create, detail, edit and confirmed-delete flows for all four sections.
- Date/search filters, sorting, pagination, inline master additions, filtered CSV and print/PDF.
- Browser-local persistence, transaction-safe stock updates across tabs and stale-edit protection.
- Responsive phone/tablet/desktop layouts, dark mode and IST dates.

The existing IndexedDB database name and storage structure are preserved. Data stays in the current browser profile and is not shared between devices. Reset demo replaces that browser's records and added master options; export anything you want to retain first.

## Phase 2 database

The `supabase/` directory contains migrations, sample data and executable SQL tests. The schema includes factory records, master lists, profiles, application configuration and an immutable audit log. Database triggers enforce stock integrity and the 20-active-user cap; row-level security defines the role permissions independently of the UI.

Start with [database setup](docs/database-setup.md) and [database design](docs/database-design.md). Migrations are not automatically applied by running the web app. No hosted Supabase project has been provisioned or connected by this version.

## Checks

```sh
npm run check
npm test
npm audit --audit-level=high
npm run build
npx playwright install chromium
npm run test:browser
npm run test:database
```

`check` runs source lint/format checks and 64 automated tests with an 80% minimum business-logic coverage threshold. The executed model/seed/date tests reached 100% lines, 98.72% branches and 98% functions; these figures do not measure all UI code. The 28 browser scenarios use the built app and fake data, including blocked external requests, stock races, exports and responsive layouts. Set `CHROMIUM_PATH` to an installed Chromium executable if preferred.

The database runner requires a running local Docker engine. It creates an isolated PostgreSQL 17 container with no published ports, runs the migrations, seed, SQL policy/constraint tests and concurrent-write cases, then removes the container. It accepts no remote database URL. Never apply the local auth test shim to a real Supabase project.

Actual results, findings and remaining limits are recorded in [validation](docs/validation.md).

## Scope and versions

Authentication is Phase 3; connecting the UI to shared database records is Phase 4. The current delivery is React web and does not produce Expo, Android or iOS binaries.

GitHub is now the application source of truth; Apper has been disconnected and is no longer used for updates. Existing commits and tags are retained. See [versioning](docs/versioning.md) for branches, pull requests, tags and rollback. The original brief, previous internal reports, local environment values and credentials are excluded from this public repository.
