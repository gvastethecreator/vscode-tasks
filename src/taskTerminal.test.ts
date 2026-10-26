import assert from "node:assert/strict";
import { test } from "node:test";
import { terminalNameMatchesTask } from "./taskTerminal.ts";

test("terminal names match the task name VS Code uses", () => {
  assert.equal(terminalNameMatchesTask("echo", "echo"), true);
  assert.equal(terminalNameMatchesTask("Task - echo", "echo"), true);
  assert.equal(terminalNameMatchesTask("echo (app)", "echo"), true);
  assert.equal(terminalNameMatchesTask("npm: hello", "hello"), true);
});

test("nearby terminal names do not steal another task", () => {
  assert.equal(terminalNameMatchesTask("echo-watch", "echo"), false);
  assert.equal(terminalNameMatchesTask("test-e2e", "test"), false);
  assert.equal(terminalNameMatchesTask("hello", "he"), false);
});
