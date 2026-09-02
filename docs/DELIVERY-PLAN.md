# Status Bar Tasks — Complete delivery plan

- Status: `0.1.0` release candidate verified locally; publication pending operator approval
- Repository: `gvastethecreator/vscode-tasks`
- Product phase: release candidate
- Target release: `0.1.0`
- Last reviewed: 2026-09-02

Unlike the other new portfolio repositories, Status Bar Tasks already has substantial implementation. This plan focuses on correctness, UX alignment, integration testing, security, attribution, and packaged-release confidence rather than scaffolding a product from zero.

---

## Delivery result — 2026-09-02

The `0.1.0` implementation is complete locally for the declared workspace-task scope.

- SBT-001 through SBT-029 are implemented in the working tree.
- SBT-030 is green on the local Windows release path: 60 unit tests, type checking, production bundling, the 0/10/100/1,000-task performance probe, Extension Host integration, VSIX creation and inspection, clean-profile VSIX installation, packaged activation, task execution, running-task focus, schema diagnostics, and dependency audit.
- The CI workflow contains the minimum/current/Insiders and Windows/macOS/Linux matrix. Its hosted result remains pending until the implementation is pushed.
- SBT-031 remains an explicit operator action. No registry publication, tag, release, commit, or push has been performed.
- The settings webview keeps the exact compact pre-PR composition. Advanced Codicon, tooltip, running-overlay, and file-glob capabilities remain available through task-source metadata without adding controls to the panel.
- The final Marketplace preview is a real 1200×800 VS Code Extension Development Host capture of that compact panel. The 256×256 Marketplace icon uses a transparent, sober, flat canvas.

The audit below is retained as the historical baseline that this implementation resolves.

---

## 1. Current state

Implemented today:

- task discovery through VS Code task/configuration APIs;
- platform-specific task configuration merging;
- matching configured task definitions to fetched `vscode.Task` objects;
- multiple Status Bar items and overflow Quick Pick;
- running-task state and terminal focusing;
- per-task label, emoji, color, visibility, tooltip, and file-pattern concepts;
- settings/configuration panel in a webview;
- editing `tasks.json` and `.code-workspace` JSONC with `jsonc-parser`;
- JSON schema contributions;
- unit tests for several pure modules;
- CI for install, unit tests, and type checking;
- icon, preview, README, changelog, and Marketplace metadata.

The latest reviewed CI run is green, but the workflow does not currently compile, package, inspect, install, or activate the final VSIX. A green unit/type workflow is therefore not release evidence.

Critical gaps and inconsistencies:

1. the CI workflow omits `pnpm run compile`, production packaging, VSIX creation, and Extension Host tests;
2. schema/types/changelog advertise per-task `icon`, but runtime attribute resolution does not apply it;
3. all running tasks use warning-background highlighting by default, although warning/error status backgrounds should represent exceptional states, not ordinary execution;
4. the extension may create many colored Status Bar items by default, conflicting with current VS Code UX guidance to limit status items and avoid decorative custom colors;
5. webview messages are trusted through TypeScript types without runtime validation;
6. CSP nonce generation uses `Math.random()`;
7. task edit identity is `URI + array index`, so a reordered file can cause the panel to edit the wrong task;
8. terminal fallback matching by name can focus the wrong terminal in multi-root/same-name cases;
9. `filePattern` compiles an arbitrary workspace regex during visibility updates;
10. closed-file persistence has no stale-write/BOM conflict strategy;
11. task discovery/matching needs real Extension Host fixtures for npm, shell, process, compound, background, contributed, user, and multi-root tasks;
12. JSON schema scope/coexistence with VS Code's built-in task schema is not proven;
13. user tasks and no-workspace windows have ambiguous product behavior;
14. the webview duplicates some native Settings functionality and retains context while hidden without measured need;
15. the project explicitly describes itself as a rewrite of `actboy168/vscode-tasks`, but attribution/NOTICE handling needs a clean legal decision before release.

---

## 2. Product contract for `0.1.0`

Status Bar Tasks should expose selected workspace tasks as quick actions without overwhelming or misrepresenting VS Code's global Status Bar.

Required user outcomes:

1. discover eligible workspace tasks reliably;
2. run a stopped task;
3. focus the terminal of a running task when association is unambiguous;
4. configure which tasks are pinned/visible;
5. keep a single overflow/menu item for all eligible tasks;
6. edit extension-owned status-bar metadata without corrupting task files;
7. remain predictable in multi-root, platform override, background-task, and duplicate-name scenarios;
8. never run workspace code merely by opening the settings panel;
9. disable execution in Restricted Mode;
10. install and work from a packaged VSIX.

---

## 3. Status Bar UX decision

Current VS Code UX guidance recommends short labels, clear icons, few items, no decorative custom colors, and warning/error backgrounds only for exceptional conditions. This product has an intentional tension with that guidance.

Before release, approve a UX ADR with the following default recommendation:

- one persistent menu/overflow Status Bar item by default;
- users explicitly pin individual task buttons;
- default maximum pinned items: 3;
- theme foreground by default;
- custom foreground color only when explicitly configured;
- no warning/error background for normal running state;
- use a spinner/running Codicon and text/tooltip to express execution;
- background tasks use `Online`; one-shot tasks use `Running`;
- compact/menu-only mode remains available and may become the default;
- extra pinned tasks move to the overflow Quick Pick;
- no green-only status semantics;
- duplicate labels include a compact folder/source disambiguator.

If the existing “show all tasks by default” behavior is retained, document why and add a strict default limit. Do not ship an unbounded row of task items.

### Running-state policy

Normal running state:

- use `$(sync~spin)` or another appropriate Codicon for one-shot tasks;
- use a non-animated service/plug/status metaphor for background tasks if needed;
- no warning background by default;
- warning/error background only when the task itself reaches a genuine warning/error state that the extension can determine reliably;
- tooltip includes task name, source/folder, and `Running`/`Online` without color-only meaning.

---

## 4. Task discovery contract

### Sources

Define and test which task classes are supported:

- configured `.vscode/tasks.json` tasks;
- tasks embedded in `.code-workspace`;
- npm/shell/process tasks configured in workspace files;
- compound tasks (`dependsOn`);
- background tasks;
- tasks contributed/detected by extensions;
- user-level tasks;
- multi-root folder tasks.

Recommended `0.1` public support:

- workspace/folder-configured tasks;
- `.code-workspace` tasks;
- tasks returned by `vscode.tasks.fetchTasks()` that can be matched to a supported source;
- user tasks listed in the menu but read-only, only if identity and behavior are proven.

Do not claim every contributed task provider works until tested.

### Discovery pipeline

```text
inspect configured task sources
→ normalize platform overrides
→ fetch executable tasks from VS Code
→ derive stable identities
→ score/match configured records to executable tasks
→ build pinned/menu presentation
```

Requirements:

- no destructive splice-based matching leaks outside a local copy;
- each result records workspace folder/source/type/name/definition identity;
- ambiguous matches remain unbound and are shown with an explanation, not attached arbitrarily;
- deterministic ordering;
- duplicate task names remain distinguishable;
- refresh is debounced/coalesced;
- stale refresh results cannot replace newer state;
- fetch failures leave the previous valid UI or a clear empty/error state;
- no task execution during discovery.

### Stable editable identity

`URI + task array index` is insufficient because array order can change after the panel renders.

Create a stable source identity containing:

- source URI;
- normalized type;
- label/name;
- important definition fields;
- original index as a hint, not authority;
- content fingerprint over non-secret task identity fields;
- workspace folder identity.

Before a write:

1. re-read the latest document;
2. resolve the task by stable identity;
3. require exactly one match;
4. reject ambiguity/stale deletion;
5. apply JSONC edit to the newly resolved index;
6. verify the intended task still owns the written metadata.

Never edit the task currently occupying an old index without revalidation.

---

## 5. Matching policy

### Matching priorities

1. exact stable source identity;
2. exact VS Code task scope/source/type plus definition fields;
3. npm script plus normalized path/cwd and scope;
4. exact label/name within the same source/folder;
5. no match if multiple equal candidates remain.

Do not fall back to global name-only matching for execution or terminal focus when duplicate names exist.

### Required task fixtures

- shell and process tasks;
- npm task in root package;
- two npm tasks with same script in different monorepo paths;
- same label in two workspace folders;
- platform-specific command/options;
- background watch server;
- compound task;
- task with presentation panel/shared terminal;
- contributed/detected task;
- user task;
- task removed/reordered while settings panel is open;
- task renamed while running.

---

## 6. Terminal focus contract

The extension should focus an already running task terminal only when association is defensible.

Association priority:

1. direct `TaskExecution → Terminal` mapping captured from lifecycle/process events;
2. exact process ID match;
3. exact unique terminal metadata/name match within the task's scope;
4. if ambiguous, show a Quick Pick of candidate terminals or explain that focus could not be resolved;
5. never focus an arbitrary last terminal solely because its name contains the task name.

Requirements:

- clean mappings on terminal close/task end/deactivation;
- handle reused terminals;
- handle background tasks that remain alive;
- handle multiple simultaneous executions of the same task;
- avoid race between task start and terminal-open events;
- no polling loops;
- integration tests use real task executions.

If VS Code does not expose enough public identity for perfect association, document the limitation and fail conservatively.

---

## 7. Metadata and configuration contract

### Per-task metadata

Current extension-owned shape:

```json
{
  "options": {
    "statusbar": {
      "hide": false,
      "label": "Build",
      "icon": { "id": "tools" },
      "color": "statusBar.foreground",
      "detail": "Build the current package",
      "filePattern": "...",
      "running": {
        "label": "Building",
        "icon": { "id": "sync" },
        "color": "statusBar.foreground"
      }
    }
  }
}
```

Before release, either fully implement every documented field or remove it from types/schema/docs.

### Icon behavior

- validate Codicon IDs conservatively;
- render one icon maximum;
- combine `$(icon)` with label in one deterministic function;
- avoid duplicate icons already embedded in a custom label;
- running override may change icon;
- invalid icon falls back without broken literal syntax;
- icon is represented consistently in panel preview and actual Status Bar.

### File visibility filter

Current raw regular-expression behavior is risky and repeatedly recompiles input.

Preferred change:

- use a glob pattern with `minimatch`-style semantics only if a lightweight safe implementation is justified; or
- keep regex explicitly named `fileRegex`, validate/cap length, compile once, cache the result, and show invalid-state feedback in the panel.

Requirements:

- no catastrophic repeated compilation;
- relative workspace paths used where possible;
- Windows/POSIX normalization;
- invalid pattern does not silently hide forever without explanation;
- workspace-controlled pattern is inert data, never executable code.

### Global settings

Review setting names before `0.1` stability. The current root `tasks.statusbar.*` may collide conceptually with generic task settings. A namespaced root such as `statusBarTasks.*` is cleaner but would require migration if already publicly released. Decide before release.

---

## 8. JSON schema strategy

The extension currently contributes schemas to broad `tasks.json` and `*.code-workspace` patterns. This must coexist with VS Code's built-in task/workspace schemas without replacing, weakening, or flooding validation.

Required investigation:

- whether multiple matching schemas are combined as intended;
- whether standard task properties retain IntelliSense/validation;
- whether unknown extension metadata is accepted by the built-in schema;
- whether `tasks.json` matches unrelated files outside `.vscode`;
- whether relative `$ref` resolution works from the packaged VSIX;
- whether `.code-workspace` schema composition is valid;
- whether schema contributions work in remote/Restricted Mode;
- whether a custom data contribution or a more narrowly scoped schema is preferable.

Acceptance behavior:

- standard VS Code task IntelliSense remains intact;
- extension fields receive descriptions/completion/validation;
- unrelated `tasks.json` files are unaffected;
- packaged schema URIs resolve;
- icon/color/background enums match runtime support exactly.

---

## 9. Persistence contract

### Open documents

- use `WorkspaceEdit`;
- preserve comments, formatting, EOL, and undo;
- reject edit if task identity no longer resolves;
- do not save automatically;
- show the document as dirty for user review.

### Closed documents

A full read/write needs concurrency protection:

1. read bytes and preserve BOM/EOL;
2. compute source fingerprint/version token;
3. create JSONC edits;
4. re-read or stat immediately before write;
5. reject if content changed;
6. preserve BOM/encoding assumptions;
7. write only if task identity still resolves uniquely;
8. verify result parses and contains intended fields;
9. no partial/corrupt write on failure.

Prefer opening the document and applying a WorkspaceEdit if that gives safer undo/review semantics.

### Directory/scope behavior

- `.vscode/tasks.json` edits use the correct WorkspaceFolder;
- `.code-workspace` edits use nested `tasks.tasks` path;
- user tasks are read-only unless a safe public URI/edit path is explicitly supported;
- virtual workspaces remain unsupported in the manifest unless tested;
- Restricted Mode disables execution and dangerous edits consistently.

---

## 10. Webview panel contract

The settings panel is justified only for per-task visual configuration and preview that native Settings cannot express efficiently. Do not duplicate every native setting without value.

### Security requirements

- runtime-validate every incoming message;
- reject unknown type, missing fields, oversized strings, invalid keys/colors/icons/URLs;
- generate nonce with `node:crypto` rather than `Math.random()`;
- exact allowlist for external URLs;
- no `enableCommandUris`;
- no trusted Markdown from task content;
- escape all source-derived content;
- prefer DOM creation/textContent over constructing large `innerHTML` strings;
- externalize script/style with `webview.asWebviewUri` and strict CSP if maintainability/security improves;
- set minimal `localResourceRoots`;
- reconsider `retainContextWhenHidden`; default to false unless state-loss cost is proven;
- dispose panel listeners and references exactly once;
- no source/task command is executed from a message without validated stable identity.

### UX/accessibility

- theme variables only;
- keyboard navigation through all fields/actions;
- visible focus states;
- labels and described errors;
- no color-only state;
- color field validates theme IDs and hex values;
- task rows identify folder/source for duplicates;
- running preview matches actual rendering;
- unsaved edits/conflicts produce clear feedback;
- panel does not open automatically or on update;
- reset action requires clear scope and confirmation when destructive.

---

## 11. Manifest, trust, and extension-host location

Current direction:

- Node/workspace extension only;
- `virtualWorkspaces.supported: false`;
- `untrustedWorkspaces.supported: false` with clear Restricted Mode description;
- `onStartupFinished` only if measured and necessary for persistent task buttons;
- likely workspace extension host preference for remote task execution;
- no browser entry.

Decisions to verify:

- whether `extensionKind: ["workspace"]` improves remote correctness;
- whether a minimal local UI companion is required (avoid split architecture unless necessary);
- whether `onStartupFinished` activation time is acceptable;
- whether a more contextual activation can still render the menu when expected;
- true minimum `engines.vscode` based on APIs used;
- behavior when no folder/workspace is open;
- behavior when Restricted Mode changes during a session.

---

## 12. Attribution and licensing

The changelog calls this a rewrite of `actboy168/vscode-tasks`, whose repository is MIT licensed.

Before release, document provenance:

- identify whether any source, schema, structure, text, or substantial implementation was copied/adapted;
- if yes, preserve the original MIT copyright/permission notice in `LICENSE` or `NOTICE` as legally required;
- if independently reimplemented, include an acknowledgement explaining inspiration without implying endorsement;
- list third-party dependencies and licenses;
- avoid Marketplace language that falsely calls the original archived/abandoned if current evidence does not support that claim;
- do not reuse original branding/icon/screenshots.

This is a release blocker, not optional polish.

---

## 13. Performance and lifecycle budgets

Measure in workspaces with 0, 10, 100, and 1,000 tasks.

Targets:

- `onStartupFinished` activation under 100 ms before asynchronous task fetch completes;
- first task presentation under 500 ms for a normal workspace, excluding slow third-party task providers;
- refresh coalescing prevents repeated `fetchTasks()` storms;
- no more than one active refresh generation;
- stale refresh result ignored;
- status item count bounded by configured/default limit;
- hidden/overflow items do not retain unnecessary UI objects;
- panel hidden state does not consume substantial retained DOM memory;
- pattern compilation cached;
- all timers/listeners/status items/panel references disposed;
- output logging bounded and disabled/quiet by default for routine operation.

Use the VS Code Running Extensions view and performance tools to record activation cost.

---

## 14. Test matrix

### Existing pure modules — expand coverage

- platform override deep merge;
- npm path/cwd normalization;
- task definition subset matching;
- duplicate name/scope ambiguity;
- icon/label/emoji composition;
- running state and background task semantics;
- glob/regex validation and cache;
- stable source identity/fingerprint;
- JSONC edit preservation;
- BOM/LF/CRLF;
- schema examples;
- panel message parser;
- persistence conflict detection;
- overflow/compact/pinned derivation.

### Desktop Extension Host fixtures

- no workspace;
- single folder tasks.json;
- `.code-workspace`;
- multi-root duplicate names;
- shell/process/npm/compound/background tasks;
- detected/contributed tasks;
- user tasks;
- platform overrides;
- run/focus/end lifecycle;
- multiple simultaneous executions;
- reused terminal;
- edit task metadata, reorder source, then edit again;
- open/closed/dirty task file;
- Restricted Mode;
- remote/WSL test where feasible;
- settings panel message validation and accessibility smoke;
- activation/performance counters.

### Schema tests

- standard task completion remains;
- extension completion appears only in appropriate nested location;
- invalid icon/background/color rejected consistently;
- unrelated `tasks.json` unaffected;
- packaged `$ref` works;
- `.code-workspace` path works.

### Package/release tests

- unit/type/compile/production build;
- VSIX creation;
- package contents/license/NOTICE/schema/media inspection;
- clean-profile installation;
- packaged activation and real task execution;
- minimum/current VS Code;
- remote installation location;
- uninstall cleanup.

---

## 15. Ordered ticket backlog

Use these IDs in GitHub Issues, branches, commits, and PR descriptions.

### Release foundations

#### SBT-001 — Complete provenance, attribution, and license audit
Priority: P0  
Depends on: none

Trace reused/adapted material, add required original notices or independent-rewrite acknowledgement, verify dependency licenses, and correct public claims.

#### SBT-002 — Add compile, production package, and VSIX checks to CI
Priority: P0  
Depends on: none

Run `compile`, production bundle, `vsce package`, archive inspection, and artifact upload. CI must fail on missing runtime output.

#### SBT-003 — Add VS Code Extension Host integration harness
Priority: P0  
Depends on: SBT-002

Add `@vscode/test-electron`, representative fixture workspace(s), activation tests, deterministic task commands, CI display/headless strategy, and timeouts.

#### SBT-004 — Approve Status Bar UX/defaults ADR
Priority: P0  
Depends on: none

Resolve compact default, pinned model, default limit, colors, overflow, running state, and alignment with current VS Code UX guidance.

### Runtime contract fixes

#### SBT-005 — Implement or remove per-task icon support
Priority: P0  
Depends on: SBT-004

Make schema/types/panel/preview/runtime agree; validate Codicons; cover running override and invalid fallback.

#### SBT-006 — Replace warning-background running state
Priority: P0  
Depends on: SBT-004

Use accessible icon/text/tooltip for ordinary running/background states. Reserve warning/error backgrounds for genuine exceptional states.

#### SBT-007 — Bound Status Bar item creation and overflow
Priority: P0  
Depends on: SBT-004

Enforce default/user limit, menu-only mode, deterministic priorities, and avoid creating unnecessary hidden items.

#### SBT-008 — Remove duplicate/dead overflow state
Priority: P1  
Depends on: SBT-007

Choose one canonical derived collection for overflow/picks; delete unused `overflowTasks` or make it authoritative with tests.

#### SBT-009 — Define no-workspace and user-task policy
Priority: P0  
Depends on: SBT-003

Decide listing/execution/edit behavior for User tasks and empty windows; update code, manifest, panel, and docs.

### Discovery and matching

#### SBT-010 — Introduce stable task and source identity models
Priority: P0  
Depends on: SBT-003

Model URI/folder/source/type/name/definition/fingerprint and distinguish editable source records from executable VS Code tasks.

#### SBT-011 — Rework discovery into generation-safe coordinator
Priority: P0  
Depends on: SBT-010

Coalesce refreshes, allow one active generation, ignore stale results, preserve previous state on failure, and expose structured result diagnostics.

#### SBT-012 — Harden task matching and ambiguity handling
Priority: P0  
Depends on: SBT-010, SBT-011

Remove unsafe global name fallback, cover npm monorepo paths, scopes, contributed tasks, compound/background tasks, and deterministic ambiguity.

#### SBT-013 — Complete multi-root/source mapping
Priority: P0  
Depends on: SBT-010, SBT-012

Map each editable task to the correct folder `tasks.json` or `.code-workspace`; never default an ambiguous workspace value to the first folder.

#### SBT-014 — Add real task-provider fixture matrix
Priority: P0  
Depends on: SBT-003, SBT-012

Exercise shell/process/npm/compound/background/detected/user tasks and document unsupported providers.

### Execution and terminal lifecycle

#### SBT-015 — Replace terminal name fallback with conservative association
Priority: P0  
Depends on: SBT-003, SBT-010

Prioritize direct execution/process mapping, require unique fallback, support simultaneous/reused terminals, and offer safe ambiguity UX.

#### SBT-016 — Harden run/focus/end state transitions
Priority: P0  
Depends on: SBT-006, SBT-015

Prevent stale running UI, task rename issues, duplicate listeners, and races between start/process/terminal/end events.

#### SBT-017 — Add background-task stop/restart decision
Priority: P1  
Depends on: SBT-016

Decide whether clicking an online background task only focuses it or exposes explicit stop/restart actions through Quick Pick. Do not overload primary click without UX review.

### Patterns, schema, and persistence

#### SBT-018 — Replace or harden `filePattern`
Priority: P0  
Depends on: SBT-004

Choose glob or explicitly named bounded regex, normalize paths, compile/cache once, surface invalid state, and test pathological input.

#### SBT-019 — Validate JSON schema coexistence and scope
Priority: P0  
Depends on: SBT-003

Test built-in task IntelliSense, narrow file matches, packaged refs, `.code-workspace`, and runtime/schema parity. Redesign contribution if schemas conflict.

#### SBT-020 — Resolve task identity immediately before writes
Priority: P0  
Depends on: SBT-010, SBT-013

Replace index authority with stable re-resolution; reject reordered/deleted/ambiguous tasks.

#### SBT-021 — Add stale-write, BOM, and closed-file conflict protection
Priority: P0  
Depends on: SBT-020

Preserve bytes/EOL/comments, detect concurrent changes, prefer WorkspaceEdit/reviewable dirty documents, verify post-write parse, and prevent partial writes.

#### SBT-022 — Review configuration namespace/scope and migration
Priority: P0  
Depends on: SBT-004

Finalize `tasks.statusbar` versus `statusBarTasks` before public stability; define global/workspace/folder targets and reset semantics.

### Webview hardening

#### SBT-023 — Add runtime parser for panel messages
Priority: P0  
Depends on: none

Validate type/shape/length/key/color/icon/URL for every message; ignore/reject unknown payloads; add malicious-input tests.

#### SBT-024 — Harden webview CSP and nonce generation
Priority: P0  
Depends on: SBT-023

Use cryptographic nonce, minimal resources, exact URL allowlist, review inline styles/scripts, localResourceRoots, and `retainContextWhenHidden`.

#### SBT-025 — Rebuild dynamic task rows with safe DOM operations
Priority: P1  
Depends on: SBT-023

Prefer `createElement`/`textContent` over source-derived HTML strings; retain accessibility and performance.

#### SBT-026 — Complete panel accessibility and error-state review
Priority: P0  
Depends on: SBT-005, SBT-018 through SBT-025

Keyboard/focus/labels/theme/high contrast/duplicate-source/conflict/invalid setting/reset behavior and preview parity.

### Performance, manifest, docs, release

#### SBT-027 — Profile activation, task fetch, refresh, and UI object counts
Priority: P0  
Depends on: SBT-007, SBT-011

Benchmark 0/10/100/1,000 tasks, slow provider, repeated changes, panel memory, and disposal. Record budgets/results.

#### SBT-028 — Verify Restricted Mode, remote host, and manifest declarations
Priority: P0  
Depends on: SBT-014, SBT-016, SBT-021

Test task execution/edit disablement, remote location, no-workspace behavior, `extensionKind`, capabilities, activation, and minimum/current VS Code.

#### SBT-029 — Replace release-facing README/preview gaps
Priority: P1  
Depends on: final UX/runtime contract

Document setup, pinned/menu model, metadata schema, task examples, running behavior, limitations, Restricted/remote support, troubleshooting, privacy, attribution, and real packaged screenshots. Update CHANGELOG.

#### SBT-030 — Complete release-candidate CI and clean-profile smoke test
Priority: P0  
Depends on: SBT-001 through SBT-029

Run all unit/integration/schema/security/performance gates, create/inspect VSIX, install into clean profile, execute/focus/edit fixtures, and archive evidence.

#### SBT-031 — Publish and verify `0.1.0`
Priority: P0  
Depends on: SBT-030

Recheck Marketplace/Open VSX name, publish artifacts, create release notes/tag, install public artifact, test remote placement, and monitor first reports.

---

## 16. Launch gate

Do not publish until:

- provenance/license/NOTICE is resolved;
- CI compiles, packages, inspects, installs, and activates the VSIX;
- Extension Host fixtures cover supported task types;
- status bar defaults are bounded and UX-reviewed;
- ordinary running tasks no longer misuse warning backgrounds;
- icon support is either real or removed everywhere;
- task/file identity cannot edit the wrong reordered task;
- matching and terminal focus fail conservatively on ambiguity;
- multi-root source resolution is proven;
- panel messages are runtime-validated and nonce is cryptographic;
- schema coexistence with built-in tasks is proven;
- stale closed-file writes cannot overwrite external changes;
- Restricted Mode and remote host behavior are tested;
- activation/performance budgets are recorded;
- README and screenshots match packaged behavior;
- no unresolved P0 defect remains.

---

## 17. Post-`0.1.0` candidates

- explicit stop/restart actions;
- task groups/presets;
- folder-aware pin sets;
- import/export of extension metadata;
- drag ordering in panel only if accessible alternative exists;
- status item progress when public task progress APIs allow it;
- richer provider-specific identity adapters;
- command API for running a stable task identity.

Avoid growing into a replacement Task Explorer or terminal manager without a new PDR.

---

## 18. Primary references

- https://code.visualstudio.com/api
- https://code.visualstudio.com/api/references/vscode-api#tasks
- https://code.visualstudio.com/api/references/vscode-api#StatusBarItem
- https://code.visualstudio.com/api/references/extension-manifest
- https://code.visualstudio.com/api/references/activation-events
- https://code.visualstudio.com/api/references/theme-color
- https://code.visualstudio.com/api/extension-guides/webview
- https://code.visualstudio.com/api/extension-guides/workspace-trust
- https://code.visualstudio.com/api/advanced-topics/extension-host
- https://code.visualstudio.com/api/advanced-topics/remote-extensions
- https://code.visualstudio.com/api/ux-guidelines/status-bar
- https://code.visualstudio.com/api/ux-guidelines/webviews
- https://code.visualstudio.com/api/ux-guidelines/quick-picks
- https://code.visualstudio.com/api/working-with-extensions/testing-extension
- https://code.visualstudio.com/api/working-with-extensions/bundling-extension
- https://code.visualstudio.com/api/working-with-extensions/publishing-extension
- https://github.com/microsoft/vscode-extension-samples
- https://github.com/actboy168/vscode-tasks
