# Brassworks

A responsive brass-factory demo built with Apper. Version 0.2.0.

Preview: https://preview--peak-brassworks-factory.apper.so

## Phase 1

- Furnace heats, overnight melting time, multi-row raw charges and spectro with automatic/manual zinc balance.
- Billet receipts and available stock grouped by company, grade and size.
- Round, Hexa, Octa and Hollow rod plans, dimensions, priorities and status transitions.
- Finished production with linked/manual orders, billet consumption, scrap and recovery.
- Complete create, record, edit and confirmed-delete flows for all four sections.
- Date/search filters, sorting, pagination, inline master additions, filtered CSV and print/PDF.
- Browser-local persistence, transaction-safe stock updates across tabs and stale-edit protection.
- Responsive phone/tablet/desktop layouts, dark mode and IST dates.

This is a demo without login. Data stays in the current browser and is not shared between devices. Cloud database, real authentication, the 20-user access limit and production security belong to later phases. This Apper React web build does not produce Expo/Android/iOS binaries.

The original factory brief and detailed internal reports remain in Apper and are excluded from this public repository.

## Run locally

Use Node 24 LTS:

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Open the localhost URL printed by Vite. Saved demo records survive refresh in a normal browser profile. Changes to the app source use Vite Fast Refresh. Reset demo replaces this browser's records and added master options.

## Validate

```sh
node scripts/check-phase-1.mjs
npm audit --audit-level=high
npm run build
```

The checker runs scoped ESLint, Prettier, 62 Node tests and minimum 80% coverage thresholds for the imported business logic. The executed calculation/model/seed tests achieved 100% lines, 98.72% branches and 98% functions. This is not coverage of all UI or platform code.

To run the browser scenarios against your local demo after starting Vite:

```sh
npx playwright install chromium
APP_BASE_URL=http://localhost:5173 node tests/browser-demo.cjs
```

For an installed system Chromium, set CHROMIUM_PATH to its executable path. The suite uses fake data in an isolated browser context and only permits localhost or the owned Brassworks preview. It covers complete workflows, stock races, invalid input, exports, persistence, responsive layouts and reset.

## Calculations

Melting time rolls an earlier ready time into the next day. Charge is the sum of raw-material weights. Automatic Zn is 100 minus Cu, Pb, Fe and Sn. Available billets are receipts minus production consumption for the exact company/grade/size group. Recovery is rod kg divided by rod kg plus scrap/butt kg, multiplied by 100.

Stock checks are browser-local demo safeguards. They must be enforced again in the future cloud database.

## Version workflow

Commit and push every completed app version to this repository. Preserve history, use feature branches and pull requests, and verify the remote commit. Internal documents and environment values stay excluded. Continuous unattended Apper-to-GitHub mirroring is not enabled.
