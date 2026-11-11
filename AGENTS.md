# Brassworks repository workflow

- The owner requires every completed app version to be committed and pushed to this repository.
- Preserve existing commits. Never force-push or overwrite unrelated work.
- Use clear conventional commit messages. Use feature branches and pull requests for subsequent changes to main.
- Update CHANGELOG.md for app versions and verify the remote commit before reporting that a version is saved.
- Keep the Apper source and the GitHub application source aligned for each version.
- The repository is public. Keep the original factory brief and detailed internal reports in Apper; exclude environment values, credentials and signing material.
- Run checks appropriate to the change. The current scaffold check is node scripts/check-phase-0.mjs.
- Do not claim that continuous synchronization is enabled until an actual mechanism has been configured and verified.
