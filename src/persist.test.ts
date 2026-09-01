import assert from "node:assert/strict";
import { test } from "node:test";
import {
  applyStatusbarFields,
  statusbarFieldPath,
  taskObjectOffset,
} from "./persistJson.ts";
import { parseTaskOriginKey, taskOriginKey } from "./panelState.ts";

test("statusbarFieldPath uses tasks.json shape for folder files", () => {
  assert.deepEqual(statusbarFieldPath("/repo/.vscode/tasks.json", 2, "hide"), [
    "tasks",
    2,
    "options",
    "statusbar",
    "hide",
  ]);
  assert.deepEqual(
    statusbarFieldPath("/repo/.vscode/tasks.json", 0, "icon.id"),
    ["tasks", 0, "options", "statusbar", "icon", "id"],
  );
});

test("statusbarFieldPath uses code-workspace nested tasks", () => {
  assert.deepEqual(
    statusbarFieldPath("/repo/app.code-workspace", 1, "label"),
    ["tasks", "tasks", 1, "options", "statusbar", "label"],
  );
});

test("applyStatusbarFields writes hide and keeps comments", () => {
  const source = `{
  // keep me
  "version": "2.0.0",
  "tasks": [
    {
      "label": "echo",
      "type": "shell",
      "command": "echo"
    }
  ]
}
`;
  const next = applyStatusbarFields(source, "/repo/.vscode/tasks.json", 0, {
    hide: false,
    label: "run",
    color: "#22C1D6",
  });
  assert.match(next, /keep me/);
  assert.match(next, /"hide": false/);
  assert.match(next, /"label": "run"/);
  assert.match(next, /"color": "#22C1D6"/);
});

test("empty color removes the key", () => {
  const source = `{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "echo",
      "options": {
        "statusbar": {
          "color": "#fff"
        }
      }
    }
  ]
}
`;
  const next = applyStatusbarFields(source, "tasks.json", 0, { color: "" });
  assert.doesNotMatch(next, /#fff/);
});

test("taskObjectOffset points at the task object", () => {
  const source = `{
  "version": "2.0.0",
  "tasks": [
    { "label": "echo" },
    { "label": "build" }
  ]
}
`;
  const offset = taskObjectOffset(source, "/repo/.vscode/tasks.json", 1);
  assert.equal(typeof offset, "number");
  assert.match(source.slice(offset ?? 0), /^\{ "label": "build"/);
});

test("taskOriginKey round-trips", () => {
  const key = taskOriginKey("file:///x:/repo/.vscode/tasks.json", 3);
  assert.deepEqual(parseTaskOriginKey(key), {
    uri: "file:///x:/repo/.vscode/tasks.json",
    index: 3,
  });
});
