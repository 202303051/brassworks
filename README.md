# Brassworks

Responsive factory-management web scaffold built with Apper.

Preview: https://preview--peak-brassworks-factory.apper.so

## Current version

Phase 0 provides Home, Furnace and Production department scope pages, a phase guide, privacy information, light/dark themes and an explicit IST clock.

Factory data-entry workflows, live stock control and production authentication are not implemented. This is a React web app; it does not produce Expo or native Android/iOS builds.

## Source

This repository contains the complete application source, UI components, assets, configuration, tests and CI configuration exported from Apper.

The original factory brief and detailed internal project reports remain in Apper. Environment files and credentials are excluded.

## Development

Use Node 24 LTS. From a fresh checkout:

```sh
npm install
npm run dev
```

Apper supplies the hosted runtime configuration. Obtain any required development settings through the project's authorized Apper settings; keep values in an ignored local environment file.

## Checks

```sh
node scripts/check-phase-0.mjs
npm run build
```

The scoped checker runs pinned ESLint and Prettier tools plus 18 Node tests. Date/time utility coverage was 100% for lines, branches and functions when exported; this is not coverage of the complete application.

## Version history

Each completed app version must be committed and pushed to this repository with a clear commit message. Use feature branches and pull requests for subsequent changes, retain previous commits for rollback, and verify the remote commit before reporting a version as saved.

An explicit push for each version is required until continuous Apper-to-GitHub synchronization has been configured and verified.
