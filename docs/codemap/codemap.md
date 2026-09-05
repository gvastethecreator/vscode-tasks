# Code map · vscode-tasks

generated: 2026-09-05T04:45:27Z
commit: cd286eafa7a1
scope: .

counts: 7 nodes · 6 edges · 0 flows · 0 unknown

## Modules

- `esbuild` · `esbuild.cjs` · interface · Esbuild
  callers: repository (calls)
  callees: external-dependencies (imports)
  tests: (none)
  entry: esbuild.cjs:main

- `external-dependencies` · `esbuild.cjs` · external · External
  callers: esbuild (imports), scripts (imports), src (imports)
  callees: (none)
  tests: (none)
  entry: esbuild.cjs:esbuild

- `media` · `media` · module · Media
  callers: (none)
  callees: (none)
  tests: (none)
  entry: media/panel.js:text

- `repository` · `package.json` · module · Repository
  callers: (none)
  callees: esbuild (calls), scripts (calls)
  tests: (none)
  entry: package.json:{

- `scripts` · `scripts` · service · Scripts
  callers: repository (calls)
  callees: external-dependencies (imports), src (imports)
  tests: (none)
  entry: scripts/check-media.mjs:verifyAlphaPng

- `src` · `src` · module · Src
  callers: scripts (imports)
  callees: external-dependencies (imports)
  tests: src/attributes.test.ts, src/codicons.test.ts, src/emoji.test.ts, src/fileGlob.test.ts, src/match.test.ts
  entry: src/attributes.ts:isObject

- `test-workspace` · `test-workspace` · module · Test Workspace
  callers: (none)
  callees: (none)
  tests: (none)
  entry: test-workspace/package.json:{

## Edges

- esbuild -> external-dependencies · imports
- repository -> esbuild · calls
- repository -> scripts · calls
- scripts -> external-dependencies · imports
- scripts -> src · imports
- src -> external-dependencies · imports

## Unknown

- none

## Flows

- none
