import assert from "node:assert/strict";
import { test } from "node:test";
import {
  formatStatusBarText,
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

test("default hide plus an explicit task pin shows only that task", () => {
  const config: TaskConfig = {
    label: "build",
    options: { statusbar: { hide: false } },
  };
  assert.equal(resolveHide(config, hidden), false);
  assert.equal(resolveHide({ label: "other" }, hidden), true);
});

test("fileGlob matches normalized relative paths", () => {
  assert.equal(shouldShowForFile(undefined, "src/app.ts"), true);
  assert.equal(shouldShowForFile("src/**/*.ts", "src\\nested\\app.ts"), true);
  assert.equal(shouldShowForFile("src/**/*.ts", "test/app.ts"), false);
  assert.equal(shouldShowForFile("src/**/*.ts", undefined), false);
});

test("parseColor keeps hex, maps names to theme, and ignores empty", () => {
  assert.deepEqual(parseColor("#22C1D6"), { type: "hex", value: "#22C1D6" });
  assert.deepEqual(parseColor("statusBar.foreground"), {
    type: "theme",
    value: "statusBar.foreground",
  });
  assert.equal(parseColor(""), undefined);
  assert.equal(parseColor("url(javascript:x)"), undefined);
  assert.equal(parseColor("red"), undefined);
});

test("one-shot running tasks use a spinner without a warning background", () => {
  const running = resolveAttrs({ label: "🚀 build" }, undefined, shown, true);
  assert.equal(running.icon, "sync~spin");
  assert.equal(formatStatusBarText(running), "$(sync~spin) build");
  assert.equal(running.backgroundColor, undefined);
});

test("background tasks use a stable broadcast icon", () => {
  const running = resolveAttrs(
    { label: "dev", isBackground: true },
    undefined,
    shown,
    true,
  );
  assert.equal(running.icon, "broadcast");
  assert.equal(formatStatusBarText(running), "$(broadcast) dev");
  assert.equal(running.backgroundColor, undefined);
});

test("per-task running overlay can explicitly set label, color, and background", () => {
  const config: TaskConfig = {
    label: "watch",
    options: {
      statusbar: {
        label: "watch",
        color: "#888888",
        running: {
          label: "watching",
          icon: { id: "rocket" },
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
  assert.equal(formatStatusBarText(running), "$(rocket) watching");
  assert.deepEqual(running.color, { type: "hex", value: "#00ff00" });
  assert.equal(running.backgroundColor, "statusBarItem.warningBackground");
});

test("running highlight is opt-in", () => {
  const running = resolveAttrs({ label: "watch" }, undefined, shown, true, true);
  assert.equal(running.backgroundColor, "statusBarItem.warningBackground");
});

test("invalid icon and file glob are bounded", () => {
  const attrs = resolveAttrs(
    {
      label: "build",
      options: { statusbar: { icon: { id: "$(inject)" }, fileGlob: "x".repeat(257) } },
    },
    undefined,
    shown,
    false,
  );
  assert.equal(attrs.icon, undefined);
  assert.match(attrs.fileGlobError ?? "", /256/);
});

test("label falls back through public task fields and icon stays in statusbar metadata", () => {
  const attrs = resolveAttrs(
    { type: "shell", options: { statusbar: { icon: { id: "tools" } } } },
    {
      name: "compile",
      source: "Workspace",
      definition: { type: "shell" },
    },
    shown,
    false,
  );
  assert.equal(attrs.label, "compile");
  assert.equal(formatStatusBarText(attrs), "$(tools) compile");
});

test("runKindOf and runningStatusLabel split one-shot and background tasks", () => {
  assert.equal(runKindOf({}), "once");
  assert.equal(runKindOf({ isBackground: true }), "background");
  assert.equal(runningStatusLabel("once"), "Running");
  assert.equal(runningStatusLabel("background"), "Online");
});
