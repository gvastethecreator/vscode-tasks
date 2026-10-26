# ADR 0002: Resolve source identity before each edit

Status: Accepted
Date: 2026-09-02

## Context

A task array index changes when a user reorders or inserts tasks. An index can edit the wrong task.

A raw file write can replace unsaved work. It also removes the normal VS Code review and undo path.

## Decision

Each source task gets a versioned identity. The identity includes the source URI, folder URI, public task fields, and a safe fingerprint.

The identity excludes `command` and `args`. The panel key does not expose these values.

Before an edit, the extension opens the source document. It resolves the identity against the latest parsed task list.

One match authorizes the edit. Zero or several matches stop the edit.

The extension calculates one minimal text replacement. It applies the replacement through `WorkspaceEdit`.

The extension does not save the document. The user can review, undo, or save the change.

## Consequences

Task reordering does not redirect an edit. Duplicate source identities require a direct source edit.

Comments, line endings, and the byte-order mark remain intact.
