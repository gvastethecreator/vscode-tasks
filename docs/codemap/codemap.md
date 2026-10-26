# Code map: vscode-tasks

Generated: 2026-10-26T07:35:22Z | Commit: `ec59ef4c01df` | Schema: 2
Generation: `7cf58ba91b16adf96f00bee7d6f6dcc25dc6290b6e3d9ce1e493b6f46ccc1209`
Scope: . | Inventory: working-tree
Nodes: 71 | Edges: 250 | Flows: 0

## Coverage

- Analysis: **partial**; 54 analyzed of 56 included files.
- Configuration files: 1; omitted untracked files: 0.
- Unresolved references and analysis limits: 298.
- Static references and call paths do not prove runtime execution or test coverage.

## Modules

- `esbuild.cjs` | module | Repository | callers: none | callees: external:javascript:esbuild, external:javascript:esbuild, external:javascript:node:path, external:javascript:node:path | tests: 0 | entry: none
- `external:javascript:@vscode/test-electron` | external | External | callers: test/integration/run-vsix.mjs, test/integration/run-vsix.mjs, test/integration/run.mjs, test/integration/run.mjs | callees: none | tests: 2 | entry: none
- `external:javascript:esbuild` | external | External | callers: esbuild.cjs, esbuild.cjs | callees: none | tests: 0 | entry: none
- `external:javascript:jsonc-parser` | external | External | callers: src/load.ts, src/load.ts | callees: none | tests: 0 | entry: none
- `external:javascript:node:assert` | external | External | callers: scripts/check-media.mjs, scripts/inspect-vsix.mjs, scripts/performance.mjs, scripts/release-artifact.mjs | callees: none | tests: 15 | entry: none
- `external:javascript:node:child_process` | external | External | callers: scripts/release-artifact.mjs, scripts/release-artifact.mjs, test/integration/run-vsix.mjs, test/integration/run-vsix.mjs | callees: none | tests: 1 | entry: none
- `external:javascript:node:crypto` | external | External | callers: scripts/release-artifact.mjs, scripts/release-artifact.mjs, src/panel.ts, src/panel.ts | callees: none | tests: 0 | entry: none
- `external:javascript:node:fs` | external | External | callers: scripts/check-media.mjs, scripts/check-media.mjs, scripts/inspect-vsix.mjs, scripts/inspect-vsix.mjs | callees: none | tests: 3 | entry: none
- `external:javascript:node:os` | external | External | callers: src/load.ts, test/integration/run-vsix.mjs, test/integration/run.mjs | callees: none | tests: 2 | entry: none
- `external:javascript:node:path` | external | External | callers: esbuild.cjs, esbuild.cjs, scripts/check-media.mjs, scripts/inspect-vsix.mjs | callees: none | tests: 2 | entry: none
- `external:javascript:node:perf_hooks` | external | External | callers: scripts/performance.mjs | callees: none | tests: 0 | entry: none
- `external:javascript:node:test` | external | External | callers: src/attributes.test.ts, src/attributes.test.ts, src/codicons.test.ts, src/codicons.test.ts | callees: none | tests: 14 | entry: none
- `external:javascript:node:url` | external | External | callers: scripts/check-media.mjs, scripts/check-media.mjs, scripts/inspect-vsix.mjs, scripts/inspect-vsix.mjs | callees: none | tests: 2 | entry: none
- `external:javascript:sharp` | external | External | callers: scripts/check-media.mjs, scripts/check-media.mjs, scripts/render-media.mjs, scripts/render-media.mjs | callees: none | tests: 0 | entry: none
- `external:javascript:vscode` | external | External | callers: src/extension.ts, src/load.ts, src/log.ts, src/panel.ts | callees: none | tests: 1 | entry: none
- `external:javascript:yauzl` | external | External | callers: scripts/inspect-vsix.mjs | callees: none | tests: 0 | entry: none
- `media/panel.js` | module | Repository | callers: none | callees: none | tests: 0 | entry: none
- `package.json` | module | Repository | callers: none | callees: none | tests: 0 | entry: none
- `scripts/check-media.mjs` | module | Repository | callers: none | callees: external:javascript:node:assert, external:javascript:node:fs, external:javascript:node:fs, external:javascript:node:path | tests: 0 | entry: none
- `scripts/inspect-vsix.mjs` | module | Repository | callers: none | callees: external:javascript:node:assert, external:javascript:node:fs, external:javascript:node:fs, external:javascript:node:path | tests: 0 | entry: none
- Showing 20 of 71 nodes. Query `impact --module <path>` or open the HTML hierarchy for the rest.

## Edges

- `esbuild.cjs` -> `external:javascript:esbuild` | calls
- `esbuild.cjs` -> `external:javascript:esbuild` | imports
- `esbuild.cjs` -> `external:javascript:node:path` | calls
- `esbuild.cjs` -> `external:javascript:node:path` | imports
- `scripts/check-media.mjs` -> `external:javascript:node:assert` | imports
- `scripts/check-media.mjs` -> `external:javascript:node:fs` | calls
- `scripts/check-media.mjs` -> `external:javascript:node:fs` | imports
- `scripts/check-media.mjs` -> `external:javascript:node:path` | imports
- `scripts/check-media.mjs` -> `external:javascript:node:url` | calls
- `scripts/check-media.mjs` -> `external:javascript:node:url` | imports
- `scripts/check-media.mjs` -> `external:javascript:sharp` | calls
- `scripts/check-media.mjs` -> `external:javascript:sharp` | imports
- `scripts/inspect-vsix.mjs` -> `external:javascript:node:assert` | imports
- `scripts/inspect-vsix.mjs` -> `external:javascript:node:fs` | calls
- `scripts/inspect-vsix.mjs` -> `external:javascript:node:fs` | imports
- `scripts/inspect-vsix.mjs` -> `external:javascript:node:path` | imports
- `scripts/inspect-vsix.mjs` -> `external:javascript:node:url` | calls
- `scripts/inspect-vsix.mjs` -> `external:javascript:node:url` | imports
- `scripts/inspect-vsix.mjs` -> `external:javascript:yauzl` | imports
- `scripts/performance.mjs` -> `external:javascript:node:assert` | imports
- `scripts/performance.mjs` -> `external:javascript:node:perf_hooks` | imports
- `scripts/performance.mjs` -> `src/fileGlob.ts` | calls
- `scripts/performance.mjs` -> `src/fileGlob.ts` | imports
- `scripts/performance.mjs` -> `src/match.ts` | calls
- `scripts/performance.mjs` -> `src/match.ts` | imports
- `scripts/release-artifact.mjs` -> `external:javascript:node:assert` | imports
- `scripts/release-artifact.mjs` -> `external:javascript:node:child_process` | calls
- `scripts/release-artifact.mjs` -> `external:javascript:node:child_process` | imports
- `scripts/release-artifact.mjs` -> `external:javascript:node:crypto` | calls
- `scripts/release-artifact.mjs` -> `external:javascript:node:crypto` | imports
- `scripts/release-artifact.mjs` -> `external:javascript:node:fs` | calls
- `scripts/release-artifact.mjs` -> `external:javascript:node:fs` | imports
- `scripts/render-media.mjs` -> `external:javascript:node:path` | imports
- `scripts/render-media.mjs` -> `external:javascript:node:url` | calls
- `scripts/render-media.mjs` -> `external:javascript:node:url` | imports
- `scripts/render-media.mjs` -> `external:javascript:sharp` | calls
- `scripts/render-media.mjs` -> `external:javascript:sharp` | imports
- `src/attributes.test.ts` -> `external:javascript:node:assert` | imports
- `src/attributes.test.ts` -> `external:javascript:node:test` | calls
- `src/attributes.test.ts` -> `external:javascript:node:test` | imports
- `src/attributes.test.ts` -> `src/attributes.ts` | calls
- `src/attributes.test.ts` -> `src/attributes.ts` | imports
- `src/attributes.test.ts` -> `src/types.ts` | imports (type only)
- `src/attributes.ts` -> `src/codicons.ts` | calls
- `src/attributes.ts` -> `src/codicons.ts` | imports
- `src/attributes.ts` -> `src/emoji.ts` | calls
- `src/attributes.ts` -> `src/emoji.ts` | imports
- `src/attributes.ts` -> `src/fileGlob.ts` | calls
- `src/attributes.ts` -> `src/fileGlob.ts` | imports
- `src/attributes.ts` -> `src/types.ts` | imports (type only)
- Showing 50 of 250 edges; JSON contains every edge and its evidence.

## Unknown

- `package.json:1`: unresolved-local-import (./dist/extension.cjs)
- `scripts/check-media.mjs:7`: object-member-call-not-resolved (path)
- `scripts/check-media.mjs:7`: object-member-call-not-resolved (path)
- `scripts/check-media.mjs:8`: object-member-call-not-resolved (path)
- `scripts/check-media.mjs:9`: object-member-call-not-resolved (path)
- `scripts/check-media.mjs:18`: object-member-call-not-resolved (path)
- `scripts/check-media.mjs:19`: object-member-call-not-resolved (assert)
- `scripts/check-media.mjs:21`: object-member-call-not-resolved (path)
- `scripts/check-media.mjs:22`: object-member-call-not-resolved (path)
- `scripts/check-media.mjs:23`: object-member-call-not-resolved (path)
- `scripts/check-media.mjs:29`: object-member-call-not-resolved (assert)
- `scripts/check-media.mjs:30`: object-member-call-not-resolved (assert)

## Flows

- no source-backed call path from a recognized trigger

## Architecture changes

- Nodes: +0 / -0; edges: +0 / -0.
- Boundary changes: 0; new cycles: 0.

## Read next

- Use `status` before relying on this generation.
- Use `impact --changed` for possible impact and related test evidence.
- Use `diff --before <model> --after <model>` for architecture changes.
