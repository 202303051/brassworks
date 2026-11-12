# Main branch and phase history

The owner now requires all completed phases on **main**, with separate conventional commits for each phase. Continue one phase at a time and wait for the owner's instruction before starting the next phase. This replaces the earlier feature/develop/PR workflow.

Phase 0, Phase 1 and Phase 2 already have separate commits. Main is advanced to include that existing history; nothing is squashed, force-pushed or rewritten. Older branch names remain historical references and are not the workflow for future phases.

| Phase                          | Source commit                            | Saved version |
| ------------------------------ | ---------------------------------------- | ------------- |
| 0: foundation                  | `cf81667`                                | `v0.1.0`      |
| 1: four factory demo workflows | `146f04c`                                | `v0.2.0`      |
| 2: database and standalone app | `de907de`, followed by test-runner fixes | `v0.3.0`      |
| Windows local setup            | Separate follow-up commit on main        | `0.3.1`       |
| 3: optional account access     | Separate conventional commit on main     | `0.4.0`       |

Phase 3 account implementation is version `0.4.0`, in a separate commit on main. Version `0.4.1` connects the owner's authorized hosted account project and isolates regression fixtures from those local settings. Factory data remains browser-local until Phase 4. See [account setup](account-setup.md) for activation and its verification boundary.

## Save each future phase

Run the appropriate checks and update the changelog before committing. Check status carefully and stage the intended app/source files explicitly. Do not stage `.tools`, environment files, credentials, the original brief or internal reports in this public repository.

```sh
git switch main
git pull --ff-only origin main
npm run check
npm run build
npm run test:browser
git status --short
```

Stage the reviewed files, commit with a message describing the phase (for example, `feat: implement Phase 3 authentication`), then save and verify:

```sh
git push origin main
git rev-parse HEAD
git ls-remote origin refs/heads/main
```

The local and remote SHAs must match before reporting that a version is saved on GitHub. A commit that exists only on this PC is reported as local. Tags name tested phase versions and must not be moved or recreated.

## Run locally

On Windows, run `scripts/setup-local.ps1` once, then double-click `Start-Brassworks.cmd`. `Brassworks-Terminal.cmd` provides Node/npm for checks. On systems with Node 24 and npm already installed:

```sh
git clone https://github.com/202303051/brassworks.git
cd brassworks
git switch main
npm ci
npm run dev
```

## Rollback

Use `git revert` on the selected commit to preserve history, repeat the relevant checks and push main. A code revert does not reverse a database migration; that needs a reviewed forward migration or tested backup restoration. Native mobile builds and OTA distribution are not part of the current web delivery.
