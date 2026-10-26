# ADR 0003: Support workspace tasks only

Status: Accepted
Date: 2026-09-02

## Context

VS Code can return workspace tasks, global User tasks, and tasks from providers. Only workspace files have a safe project edit target.

Virtual and untrusted workspaces have different execution and file guarantees.

## Decision

The extension supports tasks from folder task files and saved workspace files.

The extension also supports provider tasks when the public task scope belongs to the workspace.

Global User tasks do not appear in the menu or panel. The extension does not run or edit them.

The extension declares `extensionKind: ["workspace"]`. It runs with the workspace extension host in Remote Development.

Restricted Mode disables the extension. Virtual Workspaces are unsupported.

An empty window shows no task menu. The settings command states that a workspace is required.

## Consequences

Every editable task has one workspace-owned source URI. Remote edits use the remote file system through VS Code APIs.

User tasks, virtual workspaces, and browser hosts remain outside 0.1.0.
