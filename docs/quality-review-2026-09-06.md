# Status Bar Tasks — additional quality and competitive review

Review date: 2026-09-06. Baseline: `874c69d50f39d0afcef3a6ad6a04bc65244e584a` (`main`).

## Status and evidence

This is a review/specification document, not shipped functionality. The accompanying PR holds the live implementation checklist. Current behavior and PDR remain unchanged; later behavior changes require synchronized product/portfolio contracts.

The current ref, AGENTS, task actions, status-bar implementation and publication steps were re-read through authenticated GitHub access. No build, host integration, installed VSIX, runtime profile or registry publication was executed. Local download was blocked by DNS resolution and pnpm was unavailable. Static lifecycle risks below are not reported as reproduced production incidents.

Pinned evidence: [task actions](https://github.com/gvastethecreator/vscode-tasks/blob/874c69d50f39d0afcef3a6ad6a04bc65244e584a/src/taskActions.ts), [status bar](https://github.com/gvastethecreator/vscode-tasks/blob/874c69d50f39d0afcef3a6ad6a04bc65244e584a/src/statusBar.ts), [release](https://github.com/gvastethecreator/vscode-tasks/blob/874c69d50f39d0afcef3a6ad6a04bc65244e584a/.github/workflows/release.yml).

## Preserve the narrow product

The existing implementation has bounded pinned slots, compact menu presentation, active-file visibility, running indicators and task-terminal focus. `taskActions.ts` already handles execution identity, process IDs and ambiguous terminal names. Keep the `options.statusbar` and `tasks.statusbar.*` contract, public task identity fields and VS Code task providers. Do not introduce another package-script scanner or infer identity using private task IDs.

[Task Explorer](https://marketplace.visualstudio.com/items?itemName=spmeesseman.vscode-taskexplorer), rechecked on the review date, offers stop/restart controls and task-history conveniences. Copying those focused workflows is useful; copying its full explorer surface is not necessary.

## Stop and restart the selected execution

Add stop/restart actions to the existing task picker, with clear Running and Available presentation and accessible action labels. Operate on a specific live `TaskExecution`, not a task name or operating-system process guessed from a terminal. Multiple executions or homonymous tasks in different roots require explicit disambiguation. Keep the current run/focus default behavior for pinned buttons.

For restart, subscribe to the corresponding end event before requesting termination, then wait for that execution only. The wait must have cancellation, a bounded timeout and deterministic listener cleanup. Re-check workspace trust, task availability and relevant state before starting the replacement. A timeout or unrelated end event must never launch a second execution. Compound/background tasks need explicit tested semantics; do not promise recursive process-tree control that the public task API does not guarantee.

Use the existing matching and task-fetch infrastructure; add only the lifecycle coordinator required for serialization. Avoid `taskkill`, `pkill`, shell-based termination, custom terminals, permanent polling and a new process supervisor. Reference: [VS Code task API](https://code.visualstudio.com/api/references/vscode-api).

## Recent tasks and last observable outcome

Keep a maximum of ten recent task references per workspace, displayed in the existing menu. Store only a validated minimal identifier or non-reversible digest plus necessary non-secret lookup metadata. Do not persist complete task definitions, command lines, environment fields, terminal output or a source identity that embeds those values. Resolve references against current tasks and drop stale entries.

Keep execution results ephemeral. A known exit code may be shown as such; missing codes, cancelled waits or compound completion must not become an invented success. This is a convenience list, not an audit log or background database. No additional status-bar item or webview is required.

## Additional lifecycle risk

`watchTaskTerminals` starts an asynchronous `findTerminalByProcessId(...).then(...)` that can later populate `terminalsByExecution`. End events and disposal clear the maps, but the continuation shown does not check whether its execution is still active or the owner is disposed. Test this ordering with a controlled delayed promise. A bounded generation/disposed check plus live-execution validation should prevent stale reinsertion. This is a static race candidate; no memory leak was measured.

Also test rapid repeated run/focus clicks and a terminal closing while its PID is resolving. Do not associate a surviving terminal merely because its label matches an obsolete execution.

## Publication contract

The inspected GitHub Release job has neither checkout nor `GH_REPO`/`--repo`, despite calling `gh release`. It does not target the verified commit when creating a tag. The existence probe checks a release rather than a tag ref, and its false result also includes errors. Downloaded sidecars are not explicitly checked by the shown publication consumers.

Require explicit repository identity, preparation-stage source SHA, checksum verification before every publisher and a fail-closed tag policy. An existing mismatched tag must abort; no automatic moving, deleting or rewriting. A partial publication requires deliberate recovery. Preserve protected environments, restricted permissions and the artifact-only default. Validate with mocks/artifact checks rather than dispatching a live release. References: [CLI environment](https://cli.github.com/manual/gh_help_environment), [release creation](https://cli.github.com/manual/gh_release_create).

## Required regression evidence

| Scenario | Required outcome |
| --- | --- |
| Two `dev` tasks in distinct roots | Only the selected task execution is affected. |
| Repeated restart clicks | One termination/replacement sequence, no duplicate run. |
| End event before/after termination request | No lost wake-up; listener installed before the request. |
| Unrelated task ends or timeout occurs | No replacement is launched. |
| Background/compound tasks | Explicit behavior; no fabricated success or process-tree promise. |
| Delayed PID lookup resolves after end/dispose | Maps stay cleared; no stale execution is resurrected. |
| Recent task contains secret command/environment fields | Those fields are never persisted or displayed as history. |
| Restricted Mode or workspace removal | No task execution; waits cleanly cancelled. |
| Missing or mismatched release tag and corrupted VSIX | Fail closed before publication. |

Run existing unit, type, performance, integration and installed-VSIX checks using the declared toolchain. Record package hash, fixture, OS/editor version, cold activation and first menu/action latency. Measure with many configured tasks and multiple workspace roots; separate provider discovery cost from the extension's own rendering. Check combined portfolio status-bar noise as well as individual speed. No numerical performance result is asserted here.

## Exclusions

No second task explorer, process manager, command-history database, remote sync, provider reimplementation, arbitrary terminal capture or framework for shared runtime state. Keep English UI strings, pnpm, native controls and existing JSONC-preserving configuration writes.
