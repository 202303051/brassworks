# Brassworks

A standalone brass-factory web application. Version **0.4.1** presents all completed features in one factory interface: furnace operations, on-device spectro photo scanning, verified database source and invite-only account access. The owner's local checkout now connects to the authorized Supabase project; fresh checkouts with both public settings empty still open the no-login demo. Factory records still use browser-local storage; shared-data integration is Phase 4.

## Run locally

On this Windows PC, double-click **Start-Brassworks.cmd** and open **http://localhost:5173**. Keep the terminal window open while using the app; press Ctrl+C to stop it.

To install on a fresh Windows checkout, open PowerShell in this folder and run:

```powershell
.\scripts\setup-local.ps1
```

For a phone preview, connect the phone and PC to the same Wi-Fi and run **Start-Brassworks-Phone.cmd**. Open the printed private-network address on the phone. This is a browser preview of the React web app, not an Expo Go build. The preview binds only to a private IPv4 address on port 5174; Windows Firewall may request access to your private network. Each browser keeps its own demo data. Restart the phone preview if the PC's Wi-Fi address changes.

The installer downloads Node 24.22.1 and npm from nodejs.org, verifies the official SHA-256 checksum and installs the locked dependencies. Everything goes in the ignored `.tools/` directory; no administrator access or global PATH change is needed. **Brassworks-Terminal.cmd** opens a terminal with this local Node/npm on its PATH for maintenance commands.

If Node 24 LTS and npm are already installed, or on another operating system, run:

```sh
npm ci
npm run dev
```

Open the localhost URL printed by Vite. No environment file, builder account or plugin is needed for the demo. Source edits use Vite Fast Refresh. The app uses system fonts and makes no requests to a builder SDK or hosted font service.

## Optional factory accounts

Account access adds invitation-only sign-in, password setup/reset, administrator authenticator verification, role gates, team invitations and activation controls. [Account setup](docs/account-setup.md) describes how to activate these against a separate Supabase project. Both public environment settings are empty in the tracked example, preserving the demo for fresh checkouts. The owner's configured values remain in ignored `.env.local`. Connecting accounts does not yet connect factory records to the cloud.

## Factory workflows

- Furnace heats, overnight melting time, multi-row charges and spectro with automatic/manual zinc balance.
- Billet receipts and available stock grouped by company, grade and size.
- Round, Hexa, Octa and Hollow rod plans, dimensions, priorities and status transitions.
- Finished production with linked/manual orders, matching billet consumption, scrap and recovery.
- Create, detail, edit and confirmed-delete flows for all four sections.
- Date/search filters, sorting, pagination, inline master additions, filtered CSV and print/PDF.
- Browser-local persistence, transaction-safe stock updates across tabs and stale-edit protection.
- Responsive phone/tablet/desktop layouts, dark mode and IST dates.
- Furnace photo scan: take/upload a JPG, PNG or WebP spectro result, review detected Cu/Zn/Pb/Fe/Sn percentages and apply them to the form. OCR runs locally; photos are not uploaded or saved with the heat. Always compare the detected values with the original report. Multiple readings or unreadable elements require manual entry.

The existing IndexedDB database name and storage structure are preserved. Data stays in the current browser profile and is not shared between devices. Reset demo replaces that browser's records and added master options; export anything you want to retain first.

## Phase 2 database

The `supabase/` directory contains migrations, sample data and executable SQL tests. The schema includes factory records, master lists, profiles, application configuration and an immutable audit log. Database triggers enforce stock integrity and the 20-active-user cap; row-level security defines the role permissions independently of the UI.

Start with [database setup](docs/database-setup.md) and [database design](docs/database-design.md). Migrations are not automatically applied by running the web app. The four migrations have been applied to the owner's authorized hosted project; fresh projects still need the documented setup.

## Checks

```sh
npm run check
npm test
npm audit --audit-level=high
npm run build
npx playwright install chromium
npm run test:browser
npm run test:spectro
npm run test:auth
npm run test:database
```

`check` runs source lint/format checks and automated model/parser/security tests with an 80% minimum coverage threshold for imported modules. These figures do not measure all UI or database code. The browser scenarios use the built app and fake data, including blocked external requests, stock races, exports and responsive layouts. `test:spectro` also reads a synthetic report image with the real local OCR engine and checks applying/saving its values over LAN HTTP. Set `CHROMIUM_PATH` to an installed Chromium executable if preferred. See the validation guide for executed counts and limits.

On Windows, `scripts/setup-database-local.ps1` installs verified PostgreSQL 17 tools inside this project; the runner creates a disposable, password-protected database bound only to loopback. On other systems it uses the existing isolated Docker container. Both backends execute the same migrations, seed, SQL policy/constraint tests and genuine concurrent-write cases, then clean up. The runner accepts no remote database URL. Never apply its local auth test shim to a real Supabase project.

Actual results, findings and remaining limits are recorded in [validation](docs/validation.md).

## Scope and versions

Phase 3 account implementation is included and hosted setup has been applied to the owner's authorized project. Users complete their own password and MFA steps. Connecting factory records to shared database data is Phase 4 and has not started. The current delivery is React web and does not produce Expo, Android or iOS binaries.

GitHub is the application source of truth. All phases now use **main**, with separate commits per phase, and development continues one phase at a time. Existing commits and tags are retained. See [versioning](docs/versioning.md) for history, tags and rollback. The original brief, previous internal reports, local environment values and credentials are excluded from this public repository.
