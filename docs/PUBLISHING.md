# Publish Status Bar Tasks 0.1.0

## Required evidence

1. Make sure that the CI run is green.
2. Download `status-bar-tasks.vsix` from the CI artifact.
3. Make sure that the artifact checksum matches the release record.
4. Install the VSIX in a clean VS Code profile.
5. Run, focus, and edit the fixture tasks.
6. Make sure that `README.md`, `CHANGELOG.md`, and `package.json` use version 0.1.0.
7. Make sure that the Marketplace and Open VSX secrets are available in the `release` environment.

## Publish

1. Open the **Release** workflow.
2. Select `vscode-marketplace` or `open-vsx` from the registry input.
3. Run one registry job at a time.
4. If the first registry succeeds, run the second registry job.

The two publish jobs are independent. A failure in one registry does not publish again to the other registry.

## Public check

1. Open each public listing.
2. Make sure that version 0.1.0 is available.
3. Install the public artifact in a clean profile.
4. Run the `echo` fixture task.
5. Open the settings panel.
6. Make sure that the support link opens the project repository.

## Rollback

Do not overwrite or delete a published version.

If 0.1.0 has a release error, stop the remaining registry job. Correct the error and publish a new patch version.
