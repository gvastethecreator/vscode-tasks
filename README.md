<div align="center">
  <a href="https://marketplace.visualstudio.com/items?itemName=gvastethecreator.status-bar-tasks"><img src="media/icon.png" alt="Status Bar Tasks" width="128"></a>

# Status Bar Tasks

**Run workspace tasks from one small Status Bar menu.**

<p align="center">
  <a href="https://marketplace.visualstudio.com/items?itemName=gvastethecreator.status-bar-tasks"><img alt="VS Code Marketplace" src="https://shieldcn.dev/badge/vscode-marketplace.png?variant=outline&size=xs&theme=blue&logo=ri%3ATbBrandVscode"></a>
  <a href="LICENSE"><img alt="MIT license" src="https://shieldcn.dev/github/license/gvastethecreator/vscode-tasks.png?variant=outline&size=xs"></a>
  <a href="https://github.com/gvastethecreator/vscode-tasks/actions/workflows/ci.yml"><img alt="CI status" src="https://shieldcn.dev/github/ci/gvastethecreator/vscode-tasks.png?workflow=ci.yml&branch=main&variant=outline&size=xs"></a>
</p>
</div>

Status Bar Tasks keeps one task menu on the Status Bar. You can pin up to ten frequent tasks beside it.

<img src="media/preview.png" alt="Status Bar Tasks menu and settings" width="100%">

## Get started

1. Install **Status Bar Tasks**.
2. Open a folder or saved workspace that contains tasks.
3. Select **Status Bar Tasks: Open Status Bar Tasks Settings**.
4. Pin the tasks that you want on the Status Bar.

All matched tasks remain in the task menu. A pin only adds a direct Status Bar button.

## Pin a task in `tasks.json`

Set `options.statusbar.hide` to `false`.

```jsonc
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Build",
      "type": "shell",
      "command": "pnpm build",
      "problemMatcher": [],
      "options": {
        "statusbar": {
          "hide": false,
          "icon": { "id": "tools" },
          "detail": "Build the workspace",
          "fileGlob": "src/**/*.ts"
        }
      }
    }
  ]
}
```

The original compact settings panel writes pin, emoji, label, and color metadata. Task Codicons and advanced fields remain in the task source. Each edit leaves the source document open and dirty for review.

## Task metadata

| Field | Type | Purpose |
| --- | --- | --- |
| `hide` | boolean | `false` pins the task |
| `label` | string | Replaces the Status Bar label |
| `icon.id` | approved Codicon id | Adds a task icon |
| `color` | theme color id or hex | Sets the foreground |
| `backgroundColor` | VS Code warning or error theme color | Adds an explicit exceptional state |
| `detail` | string | Sets the plain-text tooltip |
| `fileGlob` | string | Limits the task to matching workspace files |
| `running` | object | Replaces label, icon, or colors while the task runs |

`fileGlob` supports `*`, `**`, and `?`. It does not run a regular expression.

## Running tasks

Click an idle task to start it. Click a running task to focus its terminal.

A one-shot task uses a spinner while it runs. A background task keeps a stable icon and reports `Online`.

The original green indicator is available for background tasks. Running highlight is optional and disabled by default.

The extension does not stop or restart a background task from its primary button.

## Settings

| Setting | Default | Purpose |
| --- | --- | --- |
| `tasks.statusbar.default.hide` | `true` | Shows only pinned task buttons |
| `tasks.statusbar.default.color` | empty | Uses the current theme foreground |
| `tasks.statusbar.limit` | `3` | Limits pinned buttons from zero through ten |
| `tasks.statusbar.compact` | `false` | Keeps only the task menu |
| `tasks.statusbar.select.label` | `Tasks` | Sets the task-menu label |
| `tasks.statusbar.select.icon` | `run-all` | Sets the task-menu Codicon |
| `tasks.statusbar.select.color` | empty | Sets the task-menu foreground |
| `tasks.statusbar.running.indicator` | `true` | Adds the original green indicator to an online background task |
| `tasks.statusbar.running.highlight` | `false` | Adds the original warning highlight while a task runs |

The settings panel writes these values at workspace scope.

## Supported tasks

The extension supports folder and saved-workspace task sources. It matches shell, process, compound, background, and workspace-scoped provider tasks.

Global User tasks do not appear in the menu. The extension does not run or edit them.

Restricted Mode disables the extension. Virtual Workspaces and browser hosts are unsupported.

Remote Development is supported. The extension runs with the workspace extension host and edits remote task files through VS Code.

## Troubleshooting

### A task is missing

Open the settings panel. Read the task error below its options.

If several VS Code tasks match, make the task label, provider path, or working directory unique.

### A file glob hides a task

Use a workspace-relative path. Use forward slashes in the pattern.

For example, `src/**/*.ts` matches TypeScript files below `src`.

### A running task does not focus

The extension uses the task process first. It uses a terminal name only when that match is unique.

If several terminals match, select the correct terminal from the list.

## Privacy and security

Status Bar Tasks has no telemetry and no product network requests.

The extension does not log task commands, arguments, document contents, environment values, or secrets.

Task tooltips are plain text. The settings panel uses a default-deny CSP and exact runtime message checks.

## Attribution

This project is a maintained adaptation of [actboy168/vscode-tasks](https://github.com/actboy168/vscode-tasks).

The upstream MIT notice is in [NOTICE](NOTICE).

---

<p align="center">
  <a href="https://github.com/gvastethecreator/vscode-tasks/stargazers"><img alt="GitHub stars" src="https://shieldcn.dev/github/stars/gvastethecreator/vscode-tasks.png?variant=outline&size=xs"></a>
  <a href="https://github.com/gvastethecreator"><picture><source media="(prefers-color-scheme: dark)" srcset="https://shieldcn.dev/badge/follow%20me-/gvastethecreator.png?size=xs&amp;logo=github&amp;brand=github&amp;mode=dark"><img alt="Follow gvastethecreator" src="https://shieldcn.dev/badge/follow%20me-/gvastethecreator.png?size=xs&amp;logo=github&amp;brand=github&amp;mode=light"></picture></a>
  <a href="https://github.com/sponsors/gvastethecreator"><picture><source media="(prefers-color-scheme: dark)" srcset="https://shieldcn.dev/badge/support%20this-project.png?size=xs&amp;logo=ri%3APiHeartFill&amp;logoColor=b85a90&amp;brand=github&amp;mode=dark"><img alt="Support this project" src="https://shieldcn.dev/badge/support%20this-project.png?size=xs&amp;logo=ri%3APiHeartFill&amp;logoColor=b85a90&amp;brand=github&amp;mode=light"></picture></a>
</p>
