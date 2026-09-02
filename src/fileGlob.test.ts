import assert from "node:assert/strict";
import { test } from "node:test";
import {
  clearFileGlobCache,
  compileFileGlob,
  fileGlobCacheSize,
  matchesFileGlob,
} from "./fileGlob.ts";

test("small glob syntax matches files without executing user regex", () => {
  assert.equal(matchesFileGlob("src/**/*.ts", "src/app.ts"), true);
  assert.equal(matchesFileGlob("src/**/*.ts", "src/lib/app.ts"), true);
  assert.equal(matchesFileGlob("src/?pp.ts", "src/app.ts"), true);
  assert.equal(matchesFileGlob("src/*.ts", "src/lib/app.ts"), false);
  assert.equal(matchesFileGlob("src/[x].ts", "src/[x].ts"), true);
});

test("invalid and absent globs fail safely", () => {
  assert.equal(matchesFileGlob(undefined, undefined), true);
  assert.match(compileFileGlob("x".repeat(257)).error ?? "", /256/);
  assert.match(compileFileGlob("src/\u0000.ts").error ?? "", /control/);
  assert.equal(matchesFileGlob("src/*.ts", undefined), false);
});

test("compiled glob cache stays bounded", () => {
  clearFileGlobCache();
  for (let index = 0; index < 140; index += 1) {
    compileFileGlob("src/" + index + "/*.ts");
  }
  assert.equal(fileGlobCacheSize(), 128);
});
