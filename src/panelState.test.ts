import assert from "node:assert/strict";
import { test } from "node:test";
import {
  isPanelMessageForKnownTask,
  parsePanelMessage,
  SUPPORT_URL,
  type PanelTaskRow,
} from "./panelState.ts";
import { createTaskSourceIdentity, taskIdentityKey } from "./taskIdentity.ts";

const key = taskIdentityKey(
  createTaskSourceIdentity({
    sourceUri: "file:///repo/.vscode/tasks.json",
    workspaceFolderUri: "file:///repo",
    index: 0,
    config: { type: "shell", label: "build" },
  }),
);

test("panel messages accept only bounded known payloads", () => {
  assert.deepEqual(parsePanelMessage({ type: "setTaskLabel", key, label: "Build" }), {
    type: "setTaskLabel",
    key,
    label: "Build",
  });
  assert.deepEqual(parsePanelMessage({ type: "setTaskEmoji", key, emoji: "🚀" }), {
    type: "setTaskEmoji",
    key,
    emoji: "🚀",
  });
  assert.equal(
    parsePanelMessage({ type: "setTaskLabel", key, label: "x".repeat(161) }),
    undefined,
  );
  assert.equal(parsePanelMessage({ type: "setTaskLabel", key: "bad", label: "x" }), undefined);
  assert.equal(parsePanelMessage({ type: "setTaskLabel", key, label: "bad\u0000label" }), undefined);
  assert.equal(parsePanelMessage({ type: "setTaskColor", key, color: "url(javascript:x)" }), undefined);
  assert.equal(parsePanelMessage({ type: "setTaskEmoji", key, emoji: "<script>" }), undefined);
  assert.equal(parsePanelMessage({ type: "ready", extra: true }), undefined);
  assert.equal(parsePanelMessage({ type: "unknown" }), undefined);
});

test("icons, limits, and outbound URLs use allowlists", () => {
  assert.deepEqual(parsePanelMessage({ type: "setSelectShowLabel", enabled: false }), {
    type: "setSelectShowLabel",
    enabled: false,
  });
  assert.deepEqual(parsePanelMessage({ type: "setSelectIcon", icon: "play" }), {
    type: "setSelectIcon",
    icon: "play",
  });
  assert.equal(parsePanelMessage({ type: "setSelectIcon", icon: "$(play)" }), undefined);
  assert.equal(parsePanelMessage({ type: "setLimit", limit: 11 }), undefined);
  assert.deepEqual(parsePanelMessage({ type: "openUrl", url: SUPPORT_URL }), {
    type: "openUrl",
    url: SUPPORT_URL,
  });
  assert.equal(parsePanelMessage({ type: "openUrl", url: "https://example.com" }), undefined);
  assert.deepEqual(parsePanelMessage({ type: "setDefaults" }), { type: "setDefaults" });
});

test("task messages are limited to rows in the current panel state", () => {
  const row: PanelTaskRow = {
    key,
    title: "build",
    source: "repo",
    hide: false,
    emoji: "",
    label: "",
    color: "",
    editable: true,
  };
  const known = parsePanelMessage({ type: "openTaskSource", key });
  assert.ok(known);
  assert.equal(isPanelMessageForKnownTask(known, [row]), true);

  const otherKey = taskIdentityKey(
    createTaskSourceIdentity({
      sourceUri: "file:///other/.vscode/tasks.json",
      workspaceFolderUri: "file:///other",
      index: 0,
      config: { type: "shell", label: "build" },
    }),
  );
  const unknown = parsePanelMessage({ type: "setTaskHide", key: otherKey, hide: false });
  assert.ok(unknown);
  assert.equal(isPanelMessageForKnownTask(unknown, [row]), false);
  assert.equal(isPanelMessageForKnownTask({ type: "resetSettings" }, [row]), true);
});
