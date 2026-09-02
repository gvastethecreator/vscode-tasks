import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { clearFileGlobCache, compileFileGlob } from "../src/fileGlob.ts";
import { matchTaskResult } from "../src/match.ts";

const cases = [0, 10, 100, 1000];
const results = [];

for (const count of cases) {
  const tasks = Array.from({ length: count }, (_, index) => ({
    name: "task-" + index,
    source: "Workspace",
    scope: 2,
    definition: { type: "shell" },
  }));
  const configs = Array.from({ length: count }, (_, index) => ({
    type: "shell",
    label: "task-" + index,
  }));
  clearFileGlobCache();
  const beforeHeap = process.memoryUsage().heapUsed;
  const start = performance.now();
  for (let index = 0; index < count; index += 1) {
    compileFileGlob("src/" + index + "/**/*.ts");
    assert.equal(matchTaskResult(tasks, configs[index]).task, tasks[index]);
  }
  const durationMs = performance.now() - start;
  const heapMb = Math.max(0, process.memoryUsage().heapUsed - beforeHeap) / 1024 / 1024;
  const statusBarObjects = Math.min(count, 10) + 1;
  results.push({ count, durationMs, heapMb, statusBarObjects });
}

const largest = results.at(-1);
assert.ok(largest.durationMs < 2500, "1,000-task matching exceeded 2.5 seconds.");
assert.ok(largest.heapMb < 64, "1,000-task matching exceeded 64 MB.");
assert.ok(largest.statusBarObjects <= 11, "Status bar object budget exceeded.");

for (const result of results) {
  console.log(
    [
      result.count + " tasks",
      result.durationMs.toFixed(1) + " ms",
      result.heapMb.toFixed(1) + " MB",
      result.statusBarObjects + " status items",
    ].join(" | "),
  );
}
