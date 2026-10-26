# Status Bar Tasks context

## Purpose

Status Bar Tasks connects workspace task metadata to a bounded Status Bar menu.

## Terms

- **task source**: A folder `.vscode/tasks.json` file or a saved `.code-workspace` file.
- **source task**: One task definition in a task source.
- **VS Code task**: A public `vscode.Task` returned by `vscode.tasks.fetchTasks()`.
- **source identity**: A versioned key that resolves one source task before an edit.
- **matched task**: A source task with one unambiguous VS Code task.
- **pinned task**: A source task with `options.statusbar.hide` set to `false`.
- **task menu**: The persistent Status Bar item that opens the task Quick Pick.
- **one-shot task**: A task that ends after one run.
- **background task**: A task with `isBackground` set to `true`.
- **file glob**: The bounded `fileGlob` pattern for a workspace-relative path.
- **refresh generation**: One requested load of settings, task sources, and VS Code tasks.

## Invariants

1. User tasks never enter the matched-task list.
2. A duplicate best match stays unbound.
3. The array index never authorizes a source edit.
4. A task edit uses `WorkspaceEdit` on an open document.
5. The menu plus pinned slots never exceed eleven Status Bar objects.
6. User task text never becomes trusted Markdown or HTML.
7. A refresh failure does not replace the last applied state.
8. A running background task receives focus only. A primary click never stops it.

## Boundaries

- `src/load.ts` reads task sources and builds one refresh snapshot.
- `src/match.ts` matches source tasks to public VS Code tasks.
- `src/taskIdentity.ts` creates and parses source identities.
- `src/persist.ts` performs source edits.
- `src/statusBar.ts` owns the task menu and pinned slots.
- `src/taskActions.ts` runs tasks and focuses terminals.
- `src/panelState.ts` validates the webview boundary.
- `src/panel.ts` owns the webview lifecycle.
