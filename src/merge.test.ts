import assert from "node:assert/strict";
import { test } from "node:test";
import { computeTaskInfo, platformKey, tasksFromFile } from "./merge.ts";

test("platformKey maps node platforms", () => {
  assert.equal(platformKey("win32"), "windows");
  assert.equal(platformKey("darwin"), "osx");
  assert.equal(platformKey("linux"), "linux");
});

test("computeTaskInfo merges global options then platform then task", () => {
  const info = computeTaskInfo(
    {
      label: "build",
      options: { statusbar: { label: "task" } },
      windows: { options: { statusbar: { color: "#ff0000" } } },
    },
    {
      options: { statusbar: { hide: false, color: "#00ff00" } },
      windows: { options: { statusbar: { label: "win" } } },
    },
    "win32",
  );
  assert.equal(info.type, "process");
  assert.equal(info.label, "build");
  assert.equal(info.options?.statusbar?.hide, false);
  assert.equal(info.options?.statusbar?.label, "task");
  assert.equal(info.options?.statusbar?.color, "#ff0000");
});

test("linux platform overrides do not apply on windows", () => {
  const info = computeTaskInfo(
    {
      label: "build",
      linux: { options: { statusbar: { hide: true } } },
    },
    { options: { statusbar: { hide: false } } },
    "win32",
  );
  assert.equal(info.options?.statusbar?.hide, false);
});

test("tasksFromFile ignores missing or invalid tasks arrays", () => {
  assert.deepEqual(tasksFromFile(undefined), []);
  assert.deepEqual(tasksFromFile({ tasks: "nope" }), []);
  assert.equal(tasksFromFile({ tasks: [{ label: "a" }, "x"] }).length, 1);
});
