# Compatibility

## Supported hosts

| Host | Result |
| --- | --- |
| VS Code 1.134 or newer | Supported |
| Windows, macOS, Linux | Supported |
| Remote Development | Supported through the workspace extension host |
| Saved multi-root workspace | Supported |
| Restricted Mode | Disabled by the manifest |
| Virtual Workspace | Unsupported |
| vscode.dev or web extension host | Unsupported |
| Empty window | No task menu |

## Supported task sources

- `.vscode/tasks.json` in each workspace folder.
- the `tasks` section of a saved `.code-workspace` file.

Global User tasks are outside 0.1.0.

## Supported task classes

- shell.
- process.
- compound.
- background.
- npm and other provider tasks with a public workspace scope.

Provider support requires one unambiguous public match. An ambiguous task stays unbound.

## Remote behavior

The extension declares `extensionKind: ["workspace"]`. VS Code installs and runs it where workspace tasks and files are available.

Task reads and edits use `vscode.workspace.fs`, text documents, and `WorkspaceEdit`. The extension does not use a local file-system fallback.
