# Publishing Status Bar Tasks

Extension id: `gvastethecreator.status-bar-tasks`.

Publishing is an operator action. Building a VSIX does not authorize a tag, a GitHub Release, or a registry upload.

The **Release** workflow starts from **Actions → Release → Run workflow**. Default input `artifact-only` does not publish.

## Required evidence

1. Make sure that the CI run is green.
2. Run **Release** with `artifact-only` from `main`.
3. Download `status-bar-tasks.vsix` from the workflow artifact.
4. Make sure that the artifact checksum matches the SHA-256 file.
5. Install the VSIX in a clean VS Code profile.
6. Run, focus, and edit the fixture tasks.
7. Make sure that `README.md`, `CHANGELOG.md`, and `package.json` use the version that will ship.
8. Do not add Marketplace or Open VSX secrets until the owner asks to publish.

## GitHub Actions

1. Run **Release** with `artifact-only`.
2. After approval, run one of `github-release`, `vscode-marketplace`, or `open-vsx`.
3. Run one registry job at a time.

Environments, limited to `main`:

- `github-release` uses `GITHUB_TOKEN`.
- `vscode-marketplace` uses `VSCE_PAT`.
- `open-vsx` uses `OVSX_PAT`.

The two registry jobs are independent. A failure in one registry does not publish again to the other registry.

## Manual fallback

```powershell
pnpm run vsix
pnpm run inspect:vsix
```

Marketplace: upload the exact verified VSIX at [Marketplace management](https://marketplace.visualstudio.com/manage).

Open VSX:

```powershell
pnpm exec ovsx publish .\status-bar-tasks.vsix -p $env:OVSX_PAT
```

Never place a PAT in a command, an issue, a log, or a document.

## Public check

1. Open each public listing.
2. Make sure that the shipped version is available.
3. Install the public artifact in a clean profile.
4. Run the `echo` fixture task.
5. Open the settings panel.
6. Make sure that the support link opens the project repository.

## Rollback

Do not overwrite or delete a published version.

If a release has an error, stop the remaining registry job. Correct the error and publish a new patch version.
