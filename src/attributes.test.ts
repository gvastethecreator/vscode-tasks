import assert from "node:assert/strict";
import { test } from "node:test";
import {
  parseColor,
  resolveAttrs,
  resolveHide,
  runKindOf,
  runningStatusLabel,
  shouldShowForFile,
} from "./attributes.ts";
import type { StatusBarDefaults, TaskConfig } from "./types.ts";

const shown: StatusBarDefaults = { hide: false, color: "" };
const hidden: StatusBarDefaults = { hide: true, color: "" };

test("default hide plus per-task hide false shows the task", () => {
  const config: TaskConfig = {
    label: "build",
    options: { statusbar: { hide: false } },
  };
  assert.equal(resolveHide(config, hidden), false);
  assert.equal(resolveHide({ label: "other" }, hidden), true);
});

test("task-root hide false overrides the default", () => {
  assert.equal(resolveHide({ label: "build", hide: false }, hidden), false);
});

test("statusbar hide true hides even when the default is show", () => {
  assert.equal(
    resolveHide(
      { label: "build", options: { statusbar: { hide: true } } },
      shown,
    ),
    true,
  );
});

test("filePattern matches the active path and hides on invalid regex", () => {
  assert.equal(shouldShowForFile(undefined, "C:\\src\\app.ts"), true);
  assert.equal(shouldShowForFile("test_.*", "C:\\src\\test_app.ts"), true);
  assert.equal(shouldShowForFile("test_.*", "C:\\src\\app.ts"), false);
  assert.equal(shouldShowForFile("test_.*", undefined), false);
  assert.equal(shouldShowForFile("[", "C:\\src\\app.ts"), false);
});

test("parseColor keeps hex, maps names to theme, and ignores empty", () => {
  assert.deepEqual(parseColor("#22C1D6"), { type: "hex", value: "#22C1D6" });
  assert.deepEqual(parseColor("statusBar.foreground"), {
    type: "theme",
    value: "statusBar.foreground",
  });
  assert.equal(parseColor(""), undefined);
  assert.equal(parseColor(undefined), undefined);
});

test("running overlay replaces label and color", () => {
  const config: TaskConfig = {
    label: "watch",
    options: {
      statusbar: {
        label: "watch",
        color: "#888888",
        running: {
          label: "watching",
          color: "#00ff00",
          backgroundColor: "statusBarItem.warningBackground",
        },
      },
    },
  };
  const idle = resolveAttrs(config, undefined, shown, false);
  const running = resolveAttrs(config, undefined, shown, true);
  assert.equal(idle.label, "watch");
  assert.deepEqual(idle.color, { type: "hex", value: "#888888" });
  assert.equal(running.label, "$(sync~spin) watching");
  assert.deepEqual(running.color, { type: "hex", value: "#00ff00" });
  assert.equal(running.backgroundColor, "statusBarItem.warningBackground");
});


test("label falls back to the fetched task name", () => {
  const attrs = resolveAttrs(
    { type: "shell" },
    { name: "compile", source: "Workspace", definition: { type: "shell" } },
    shown,
    false,
  );
  assert.equal(attrs.label, "compile");
});

test("running tasks get a spinner when no custom overlay is set", () => {
  const config: TaskConfig = { label: "build" };
  const idle = resolveAttrs(config, undefined, shown, false);
  const running = resolveAttrs(config, undefined, shown, true);
  assert.equal(idle.label, "build");
  assert.equal(running.label, "$(sync~spin) build");
  assert.equal(running.backgroundColor, "statusBarItem.warningBackground");
});

test("a running spinner replaces a leading emoji", () => {
  const running = resolveAttrs(
    { label: "build", options: { statusbar: { label: "🚀 build" } } },
    undefined,
    shown,
    true,
  );
  assert.equal(running.label, "$(sync~spin) build");
});

test("background tasks keep the idle label; the green bullet is the marker", () => {
  const config: TaskConfig = { label: "dev", isBackground: true };
  const running = resolveAttrs(config, undefined, shown, true);
  assert.equal(running.label, "dev");
  assert.equal(running.backgroundColor, "statusBarItem.warningBackground");
});

test("task.isBackground is enough to mark a server", () => {
  const running = resolveAttrs(
    { label: "serve" },
    { name: "serve", definition: { type: "shell" }, isBackground: true },
    shown,
    true,
  );
  assert.equal(running.label, "serve");
  assert.equal(running.backgroundColor, "statusBarItem.warningBackground");
});

test("background custom overlay still gets the warning pill", () => {
  const config: TaskConfig = {
    label: "dev",
    isBackground: true,
    options: { statusbar: { running: { label: "online" } } },
  };
  const running = resolveAttrs(config, undefined, shown, true);
  assert.equal(running.label, "online");
  assert.equal(running.backgroundColor, "statusBarItem.warningBackground");
});

test("highlight off skips the warning pill", () => {
  const running = resolveAttrs({ label: "build" }, undefined, shown, true, false);
  assert.equal(running.backgroundColor, undefined);
});

test("runKindOf and runningStatusLabel split once vs background", () => {
  assert.equal(runKindOf({}), "once");
  assert.equal(runKindOf({ isBackground: true }), "background");
  assert.equal(
    runKindOf(
      {},
      { name: "x", definition: { type: "shell" }, isBackground: true },
    ),
    "background",
  );
  assert.equal(runningStatusLabel("once"), "Running");
  assert.equal(runningStatusLabel("background"), "Online");
});
