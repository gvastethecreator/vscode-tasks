# PDR — Status Bar Tasks

Repo: `X:\\vscode-extensions\\vscode-tasks`
Remote: `gvastethecreator/vscode-tasks`
Extension id: `gvastethecreator.status-bar-tasks`

## Status

0.1.0 release candidate · Priority P0

## Product summary

Status Bar Tasks gives workspace tasks a small, controlled surface in the VS Code Status Bar.

The extension keeps one task menu on the Status Bar. Users can pin up to ten tasks beside that menu.

The extension reads task metadata from workspace files. It uses the public VS Code Tasks API to run each task.

## User jobs

1. Run a workspace task without opening the Command Palette.
2. Focus the terminal of a task that is already running.
3. Pin a small set of frequent tasks.
4. Keep all matched tasks in one searchable menu.
5. Edit Status Bar metadata without losing comments in the task source.

## 0.1.0 scope

- folder `.vscode/tasks.json` files.
- task sections in saved `.code-workspace` files.
- shell, process, compound, background, and workspace-scoped provider tasks.
- one task menu with three pinned-task slots by default.
- a user limit from zero through ten pinned tasks.
- per-task label, approved Codicon, color, tooltip, running style, and file glob.
- a compact settings panel.
- safe task-source edits through `WorkspaceEdit`.
- local unit, performance, Extension Host, and packaged-VSIX checks.
- separate release jobs for VS Code Marketplace and Open VSX.

## Status Bar contract

The extension shows one menu item for an open workspace. The menu lists all matched tasks that apply to the active file.

The setting `tasks.statusbar.default.hide` is `true` by default. A task is pinned when `options.statusbar.hide` is `false`.

The default pin limit is three. The maximum supported limit is ten.

An ordinary running task uses `$(sync~spin)`. A background task uses a stable icon and the text status `Online`. The original green indicator remains an optional setting.

The extension does not use warning or error backgrounds by default. The user can enable the original running highlight, or a task can request one of the two VS Code background theme colors.

## Task discovery and matching

The extension reads each task source by URI. It does not infer an ambiguous source from the first workspace folder.

The extension calls `vscode.tasks.fetchTasks()` once for a refresh. It removes global User tasks before matching.

Matching uses the task source, workspace scope, public name, public definition, provider type, script, path, and working directory.

If two candidates have the same best score, the task stays unbound. The panel shows the ambiguity.

The extension never uses the private `Task._id` field. It does not use a global task-name fallback.

## Run and terminal contract

A click starts an idle task. A click on a running task focuses its terminal.

Terminal association uses the task execution and process id first. A terminal-name match is valid only when it is unique.

If several terminals match, the extension asks the user to select one. If no terminal matches, the extension reports that result.

A click on an online background task only focuses it. Stop and restart actions are outside 0.1.0.

## Task metadata

Task metadata stays under `options.statusbar`.

```jsonc
{
  "label": "Build",
  "type": "shell",
  "command": "pnpm build",
  "options": {
    "statusbar": {
      "hide": false,
      "label": "Build",
      "icon": { "id": "tools" },
      "color": "statusBar.foreground",
      "detail": "Build the workspace",
      "fileGlob": "src/**/*.ts"
    }
  }
}
```

`fileGlob` supports `*`, `**`, and `?`. It matches a workspace-relative path.

The settings panel keeps the original compact layout: four bar toggles, five small bar fields, one-line task rows, the preview, reset, and the original support link. Task rows expose show, emoji, label, color, and source-edit controls. Task Codicon, tooltip, running overlay, and file-glob metadata remain editable in the task source.

The extension does not support the pre-release `filePattern` field. There is no regular-expression execution path.

## Persistence contract

Each panel row contains a versioned source identity. The identity contains no task command or argument values.

Before an edit, the extension opens the source document and resolves the task identity again. The array index is only a hint.

The extension refuses a missing or duplicate identity. It also refuses malformed option containers and any edit that produces invalid JSON.

The extension applies one minimal `WorkspaceEdit`. The source stays open and dirty for review, undo, and save.

This path preserves comments, line endings, and the document byte-order mark.

## Settings scope

Global settings use the existing `tasks.statusbar.*` namespace. The settings panel writes them at workspace scope.

Task-specific settings stay in the task source. Reset removes only the workspace values in this namespace.

## Compatibility

| Environment | Support |
| --- | --- |
| Desktop Node extension host | Full on VS Code 1.134 or newer |
| Web extension host / vscode.dev | No |
| Virtual Workspaces | No |
| Untrusted Workspaces | No. VS Code disables the extension in Restricted Mode |
| Remote Development | Full. The extension runs with the workspace extension host |
| Saved multi-root workspace | Full |
| Empty window | No task menu. The settings command explains that a workspace is required |
| User tasks | Not listed, run, or edited in 0.1.0 |
| Windows, macOS, Linux | Supported |

## Security and privacy

- no telemetry.
- no product network requests.
- no logs of commands, arguments, document contents, environment values, or secrets.
- no command URI in a tooltip.
- plain-text task tooltips.
- exact runtime parsing for panel messages and current-row authorization for task actions.
- approved Codicon and URL lists.
- a cryptographic webview nonce.
- a default-deny CSP.
- local CSS and JavaScript only.
- no raw write to a closed task file.

The support link opens the public project repository after an explicit click.

## Accessibility

- one stable Status Bar menu has an accessible name.
- each pinned task has an accessible name and plain-text status.
- running state uses icon, text, and tooltip information.
- the panel uses native labels, compact task rows, focus outlines, and error text.
- settings do not depend on color alone.
- the panel uses VS Code theme colors and works at a narrow width.

## Performance budgets

- one task fetch can occur at a time.
- stale refresh generations cannot replace new state.
- a failed refresh keeps the last applied state.
- file-glob cache size is 128.
- Status Bar objects are limited to one menu plus ten pinned slots.
- the 1,000-task pure matching check must finish in less than 2.5 seconds.
- the same check must use less than 64 MB of additional heap.

## Explicit non-goals

- User-task support.
- browser or virtual-workspace support.
- task creation or command editing.
- automatic stop or restart for background tasks.
- task-output parsing.
- telemetry, accounts, cloud sync, or a service.
- support for arbitrary regular expressions.
- backward compatibility with unpublished 0.0.x metadata.

## Acceptance criteria

- ordinary running tasks do not use a warning background unless the user explicitly enables it.
- the menu remains available when a workspace has no matched tasks.
- no refresh creates more than eleven Status Bar objects.
- duplicate task matches fail closed.
- multi-root files map to their exact source URI.
- reordered tasks resolve by stable identity before an edit.
- task edits keep the document open, dirty, and reviewable.
- panel messages reject unknown types and invalid values.
- task schemas coexist with built-in task validation.
- Extension Host checks cover the supported task matrix.
- the production VSIX is inspected, installed in an isolated profile, activated, and exercised.
- CI covers Windows, macOS, Linux, minimum VS Code, stable VS Code, and Insiders.

## Release boundary

Implementation can build and check the 0.1.0 VSIX without registry credentials.

Merging, tagging, publishing, unpublishing, and deprecating remain explicit operator actions.
