# Versioning and source ownership

GitHub is the source of truth for Brassworks. The Apper connection was removed at the owner's request; this repository runs independently and future changes are not synchronized back to Apper. Existing history and version tags are retained.

- `main`: production history.
- `develop`: integration through reviewed pull requests.
- `feature/phase-2-database-standalone`: Phase 2 and removal of builder dependencies.
- `v0.3.0`: the Phase 2 application/database source version.

Every completed version is committed, pushed and checked against the remote SHA. Never force-push or overwrite unrelated work. Keep the original brief, earlier internal reports, credentials, local environment values and signing material out of this public repository. Application source, migrations, executable tests and public setup/validation guides belong here.

## Exact Phase 2 workflow

The working phase branch is already created from `develop`. These commands describe the complete save/review workflow; do not recreate an existing branch or version tag.

```sh
git switch develop
git pull --ff-only origin develop
git switch -c feature/phase-2-database-standalone
npm ci
npm run check
npm audit --audit-level=high
npm run build
npm run test:browser
npm run test:database
git add .
git commit -m "feat: add Phase 2 database and standalone application"
git push -u origin feature/phase-2-database-standalone
```

Create a public PR body in a local text file describing the final change and actual validation, then open the PR:

```sh
gh pr create --base develop --head feature/phase-2-database-standalone --title "feat: add Phase 2 database and standalone app" --body-file phase-2-pr.md
```

After review and successful required checks, merge through GitHub's PR page. Create the annotated version tag on the tested source commit, not on an unrelated branch:

```sh
git switch feature/phase-2-database-standalone
git tag -a v0.3.0 -m "Phase 2: database and standalone application"
git push origin refs/tags/v0.3.0
git ls-remote origin refs/heads/feature/phase-2-database-standalone refs/tags/v0.3.0 'refs/tags/v0.3.0^{}'
```

The tag's peeled SHA must match the tested branch commit. PR merge state, source SHA and actual checks are reported in [validation](validation.md); these example commands do not imply a PR has already been merged. Publishing a GitHub Release uses the tested tag and notes from `CHANGELOG.md`.

## Check out a saved version

```sh
git clone https://github.com/202303051/brassworks.git
cd brassworks
git fetch origin --tags
git switch --detach v0.3.0
npm ci
npm run dev
```

## Rollback

Use `git revert` through a new branch and PR to undo source changes while preserving history. For example, select the commit to revert with `git log --oneline`, run `git revert` with that selected SHA, rerun the relevant checks and push the branch for review.

A source revert does not undo an already-applied database migration. Database rollback requires a reviewed forward migration or a verified backup restore; do not drop tables to make the source look older. The current web delivery has no Expo/EAS builds or OTA updates to republish.
