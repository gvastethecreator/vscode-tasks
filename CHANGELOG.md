# Changelog

All notable changes to Status Bar Tasks are documented in this file.

## [0.1.0] - Unreleased

### Added

- One persistent task menu and up to ten pinned task buttons.
- A compact settings panel for task visibility, emojis, labels, colors, running controls, preview, reset, and project support. Advanced metadata remains in the task source.
- A menu-icon picker with Codicon previews.
- A Show label toggle for the task menu button.
- Stable source identities for folder and saved-workspace task files.
- Workspace-scoped provider, compound, process, shell, and background task fixtures.
- Unit, performance, Extension Host, schema, VSIX inspection, and clean-profile smoke checks.
- Separate manual release jobs for VS Code Marketplace and Open VSX.

### Changed

- Hide all is off by default. Matched tasks can appear on the Status Bar up to the pin limit.
- The task menu label defaults to `tasks`.
- The default pin limit is three.
- One-shot tasks use a spinner. Background tasks use a stable icon and the `Online` status.
- Task matching uses public name, definition, scope, provider, path, and working-directory fields.
- Terminal focus uses execution and process association before a unique name fallback.
- The extension runs with the workspace extension host in Remote Development.
- Task-source edits use `WorkspaceEdit` and stay open for review.

### Security

- Panel messages use exact runtime checks for type, shape, length, current task identity, emoji, icon, color, and URL.
- The panel uses a cryptographic nonce, local assets, and a default-deny CSP.
- Dynamic task rows use DOM creation and `textContent`.
- Task tooltips are plain text.
- User task commands and arguments never enter panel identity keys.

### Removed

- Arbitrary `filePattern` regular expressions. Use `fileGlob`.
- The default warning background for ordinary running tasks. The running highlight remains available as an explicit setting.
- The unbounded Status Bar item path.
- The unsafe global task-name fallback.
- Raw writes to closed task files.
- Global User-task discovery in 0.1.0.
