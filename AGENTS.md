# Status Bar Tasks

VS Code extension `gvastethecreator.status-bar-tasks`. pnpm. TypeScript in `src/`. esbuild writes `dist/extension.cjs`.

## Commands

- Install: `pnpm install`
- Test: `pnpm test`
- Types: `pnpm run check-types`
- Compile: `pnpm run compile`
- Watch: `pnpm run watch`
- Production bundle: `pnpm run package`
- VSIX: `pnpm run vsix`

F5 (`Run Extension`) compiles, then opens `test-workspace/`.

## Rules

- Package manager is pnpm. Do not switch to npm or yarn.
- Product UI strings stay English. Operator chat may be Spanish.
- Keep the `tasks.json` contract: `options.statusbar` and `tasks.statusbar.*`.
- Identify tasks with public `name`, `definition`, and `scope`. Do not use `task._id`.
- Fetch workspace tasks with `vscode.tasks.fetchTasks()`, then filter `source`.
- Do not set `MarkdownString.isTrusted` on user tooltip text.
- Do not commit `.vscode/settings.json` or `test-workspace/.vscode/settings.json`.
- Do not write tickets under `docs/`. Local tickets: `.scratch/vscode-tasks/issues/`.
- Do not commit, push, or rewrite git history unless the user asks.

## Agent skills

### Issue tracker

GitHub Issues and the linked GitHub Project hold live state. `.scratch/` holds synchronized local mirrors. See `docs/agents/issue-tracker.md`.

### Triage labels

Category: `bug` or `enhancement`. Triage: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. Project status: `Todo`, `In Progress`, `Done`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: root `CONTEXT.md` plus `docs/adr/`. See `docs/agents/domain.md`.

## Layout

- `src/extension.ts` — activate, commands, reload
- `src/load.ts` — inspect `tasks` config, fetch, build items
- `src/match.ts` — config to `vscode.Task`
- `src/taskIdentity.ts` — stable source-task identity
- `src/refreshCoordinator.ts` — serialized, generation-safe refreshes
- `src/merge.ts` — platform overlay
- `src/attributes.ts` — status bar options, hide, color, running marker
- `src/fileGlob.ts` — bounded active-file filters
- `src/codicons.ts` — approved task icon ids
- `src/menuIconSvg.ts` — Codicon glyphs for the menu-icon picker
- `src/statusBar.ts` — one task menu and bounded pinned slots
- `src/overflowButton.ts` — compact menu button text
- `src/taskActions.ts` — run or focus the task terminal
- `src/taskTerminal.ts` — match a task to its terminal name
- `src/emoji.ts` / `src/runningControls.ts` — compact emoji labels and optional running indicators
- `src/panel.ts` / `src/panelState.ts` — settings webview
- `media/panel.css` / `media/panel.js` — compact panel presentation and DOM behavior
- `src/persist.ts` / `src/persistJson.ts` — settings and `tasks.json` writes
- `src/*.test.ts` — Node test runner
- `test/integration/` — Extension Host and packaged-VSIX checks
- `scripts/` — performance and VSIX inspection gates
- `schemas/` — JSON validation for `tasks.json` and `*.code-workspace`
- `test-workspace/` — Extension Host folder
- `docs/agents/` — issue tracker, triage labels, domain docs
