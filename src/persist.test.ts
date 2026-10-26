import assert from "node:assert/strict";
import { test } from "node:test";
import {
  applyStatusbarFields,
  isValidTaskSource,
  minimalReplacement,
  resolveTaskIndex,
  statusbarFieldPath,
  taskObjectOffset,
} from "./persistJson.ts";
import { createTaskSourceIdentity } from "./taskIdentity.ts";

const sourceUri = "file:///repo/.vscode/tasks.json";

test("statusbarFieldPath supports folder and code-workspace task shapes", () => {
  assert.deepEqual(statusbarFieldPath("/repo/.vscode/tasks.json", 2, "hide"), [
    "tasks", 2, "options", "statusbar", "hide",
  ]);
  assert.deepEqual(statusbarFieldPath("/repo/app.code-workspace", 1, "icon.id"), [
    "tasks", "tasks", 1, "options", "statusbar", "icon", "id",
  ]);
});

test("applyStatusbarFields keeps comments and line endings", () => {
  const source = "{\r\n  // keep me\r\n  \"version\": \"2.0.0\",\r\n  \"tasks\": [{ \"label\": \"echo\", \"type\": \"shell\", \"command\": \"echo\" }]\r\n}\r\n";
  const next = applyStatusbarFields(source, "/repo/.vscode/tasks.json", 0, {
    hide: false,
    label: "run",
    color: "#22C1D6",
  });
  assert.match(next, /keep me/);
  assert.match(next, /"hide": false/);
  assert.match(next, /"label": "run"/);
  assert.ok(next.includes("\r\n"));
});

test("task edits preserve and accept a UTF-8 BOM", () => {
  const source = "\ufeff{\n  \"version\": \"2.0.0\",\n  \"tasks\": [{ \"label\": \"echo\", \"type\": \"shell\" }]\n}\n";
  const next = applyStatusbarFields(source, "/repo/.vscode/tasks.json", 0, {
    hide: false,
  });
  assert.equal(next.startsWith("\ufeff"), true);
  assert.equal(isValidTaskSource(next, "/repo/.vscode/tasks.json"), true);
});

test("task edits refuse malformed option containers", () => {
  const source = "{\"tasks\":[{\"label\":\"echo\",\"options\":\"leave me\"}]}";
  assert.throws(
    () => applyStatusbarFields(source, "/repo/.vscode/tasks.json", 0, { hide: false }),
    /options value must be an object/,
  );
  assert.match(source, /leave me/);
});

test("stable identity re-resolves after task array reordering", () => {
  const identity = createTaskSourceIdentity({
    sourceUri,
    workspaceFolderUri: "file:///repo",
    index: 0,
    config: { type: "shell", label: "build", command: "pnpm build" },
  });
  const moved = [
    "{",
    "  \"version\": \"2.0.0\",",
    "  \"tasks\": [",
    "    { \"type\": \"shell\", \"label\": \"test\", \"command\": \"pnpm test\" },",
    "    { \"type\": \"shell\", \"label\": \"build\", \"command\": \"changed command\" }",
    "  ]",
    "}",
  ].join("\n");
  assert.deepEqual(resolveTaskIndex(moved, "/repo/.vscode/tasks.json", identity), {
    index: 1,
  });
});

test("duplicate source identities refuse edits", () => {
  const identity = createTaskSourceIdentity({
    sourceUri,
    workspaceFolderUri: "file:///repo",
    index: 0,
    config: { type: "shell", label: "build" },
  });
  const duplicate = [
    "{",
    "  \"version\": \"2.0.0\",",
    "  \"tasks\": [",
    "    { \"type\": \"shell\", \"label\": \"build\" },",
    "    { \"type\": \"shell\", \"label\": \"build\" }",
    "  ]",
    "}",
  ].join("\n");
  const result = resolveTaskIndex(duplicate, "/repo/.vscode/tasks.json", identity);
  assert.ok("error" in result);
});

test("minimalReplacement limits edits to the changed span", () => {
  assert.deepEqual(minimalReplacement("hello world", "hello brave world"), {
    start: 6,
    end: 6,
    text: "brave ",
  });
  assert.equal(minimalReplacement("same", "same"), undefined);
  const bom = minimalReplacement("\ufeff{\"a\":1}", "\ufeff{\"a\":2}");
  assert.equal(bom?.start, 6);
  assert.equal(bom?.text, "2");
});

test("task source validation rejects partial JSON", () => {
  assert.equal(isValidTaskSource("{\"tasks\": []}", "tasks.json"), true);
  assert.equal(isValidTaskSource("{\"tasks\": [", "tasks.json"), false);
});

test("taskObjectOffset points at the selected task object", () => {
  const source = [
    "{",
    "  \"tasks\": [",
    "    { \"label\": \"echo\" },",
    "    { \"label\": \"build\" }",
    "  ]",
    "}",
  ].join("\n");
  const offset = taskObjectOffset(source, "/repo/.vscode/tasks.json", 1);
  assert.equal(typeof offset, "number");
  assert.match(source.slice(offset ?? 0), /^\{ "label": "build"/);
});
