# Changelog

All notable changes to Status Bar Tasks are documented in this file.

## [0.0.1] - unreleased

Rewrite of [actboy168/vscode-tasks](https://github.com/actboy168/vscode-tasks) for current VS Code.

### Added

- TypeScript source, esbuild bundle, pnpm, Node tests, and GitHub Actions CI
- Settings webview, command **Status Bar Tasks: Open Status Bar Tasks Settings**, and a gear on the status bar
- Per-task show, label, icon, color, tooltip, and file pattern edits written to `tasks.json`
- npm matching by `path` and `cwd`

### Changed

- Publisher `gvastethecreator`, extension id `status-bar-tasks`
- Commands `statusBarTasks.run`, `statusBarTasks.select`, and `statusBarTasks.openPanel`
- Fetch all workspace tasks, then match by public `name`, `definition`, and `scope`
- Tooltips are not trusted markdown
