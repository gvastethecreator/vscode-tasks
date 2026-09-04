# ADR 0001: Use one task menu and bounded pins

Status: Accepted
Date: 2026-09-02

## Context

The pre-release design can create one Status Bar item for every visible task. Large workspaces can create too many items.

An ordinary running task also uses a warning background. VS Code reserves this background for important warnings.

## Decision

The extension keeps one task menu for an open workspace.

Hide all is off by default. A task can hide itself with `options.statusbar.hide: true`.

The default pin limit is three. The user can select a limit from zero through ten.

A one-shot task uses the spinning sync icon while it runs. A background task uses a stable icon and the `Online` status.

The default running state has no warning or error background.

The green indicator stays enabled for online background tasks. The warning highlight stays available as an opt-in setting.

A click on a running task focuses its terminal. A click does not stop or restart a background task.

## Consequences

The Status Bar stays bounded. All matched tasks remain available in the menu.

The new defaults replace the unpublished 0.0.x behavior. There is no compatibility setting.
