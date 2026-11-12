# Brassworks repository workflow

- The owner requires every completed app version to be committed and pushed to this repository.
- Preserve existing commits. Never force-push or overwrite unrelated work.
- Use clear conventional commit messages. The owner now requires all phases on `main`, with separate commits for each phase. Continue one phase at a time; do not start the following phase until the owner asks.
- Present all completed features in one unified application. Development phases belong in Git history and technical documentation, not in navigation, banners or separate app interfaces. Preserve the existing demo storage name so updates retain saved browser records.
- Update CHANGELOG.md for app versions and verify the remote commit before reporting that a version is saved.
- The owner removed Apper. GitHub is the application source of truth; the application must run locally without platform SDKs or accounts.
- The repository is public. Exclude the original factory brief, detailed internal reports, local environment values, credentials and signing material. Publish safe setup instructions and validation summaries.
- Run checks appropriate to the change: npm run check, npm run build, npm run test:database and the local browser scenarios. Database tests must use an isolated disposable database and fake data.
- Phase 2 prepares the database. Preserve browser-local demo workflows until the later shared factory-data phase.
- Phase 3 implements invite-only Supabase accounts. The owner has now authorized connecting the hosted project and bootstrapping the specified first Admin. Public connection settings stay only in ignored local environment files; never commit project credentials or personal account details. Keep previous-phase browser regression builds disconnected from hosted accounts. Phase 4 shared factory data has not started. Include `npm run test:auth` in checks for auth changes.
- Use `Start-Brassworks.cmd` to run on this Windows PC. `scripts/setup-local.ps1` installs a project-local Node/npm runtime; never commit `.tools/` or local data.
- On Windows, `scripts/setup-database-local.ps1` installs the project-local PostgreSQL test binaries. `npm run test:database` then uses a disposable, password-protected loopback cluster; Docker remains the other supported test backend. Never run the auth shim or test fixtures on a hosted or real-data database.
