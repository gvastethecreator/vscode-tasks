import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createTaskSourceIdentity,
  parseTaskIdentityKey,
  taskIdentityKey,
  taskIdentityMatches,
} from "./taskIdentity.ts";

test("task identity round-trips without command or args", () => {
  const identity = createTaskSourceIdentity({
    sourceUri: "file:///repo/.vscode/tasks.json",
    workspaceFolderUri: "file:///repo",
    index: 2,
    config: {
      type: "shell",
      label: "build",
      command: "secret-command",
      args: ["secret-argument"],
      options: { cwd: "./app" },
    },
  });
  const key = taskIdentityKey(identity);
  assert.deepEqual(parseTaskIdentityKey(key), identity);
  assert.doesNotMatch(Buffer.from(key.slice(5), "base64url").toString("utf8"), /secret/);
});

test("identity survives command edits but not source identity edits", () => {
  const identity = createTaskSourceIdentity({
    sourceUri: "file:///repo/.vscode/tasks.json",
    workspaceFolderUri: "file:///repo",
    index: 0,
    config: { type: "shell", label: "build", command: "one" },
  });
  assert.equal(
    taskIdentityMatches(
      identity,
      "file:///repo/.vscode/tasks.json",
      "file:///repo",
      { type: "shell", label: "build", command: "two" },
    ),
    true,
  );
  assert.equal(
    taskIdentityMatches(
      identity,
      "file:///repo/.vscode/tasks.json",
      "file:///repo",
      { type: "shell", label: "test", command: "two" },
    ),
    false,
  );
});

test("malformed and oversized identity keys are rejected", () => {
  assert.equal(parseTaskIdentityKey("not-an-identity"), undefined);
  assert.equal(parseTaskIdentityKey("sbt1:" + "x".repeat(2050)), undefined);
});
