# ADR 0004: Keep the upstream MIT notice

Status: Accepted
Date: 2026-09-02

## Context

Status Bar Tasks adapts concepts and code structure from `actboy168/vscode-tasks`.

The upstream project uses the MIT License. Its copyright notice must remain with adapted portions.

## Decision

The repository keeps its MIT `LICENSE` for the current project.

The packaged `NOTICE` file identifies the upstream project. It includes the complete upstream MIT notice.

The README and changelog identify the project as a maintained adaptation.

## Consequences

The VSIX contains both the project license and the upstream notice.

Release checks fail when `NOTICE` is absent from the package.
