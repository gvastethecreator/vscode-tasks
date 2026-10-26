import assert from "node:assert/strict";
import { test } from "node:test";
import {
  matchTaskResult,
  namesMatch,
  sameTask,
  scoreMatch,
} from "./match.ts";
import type { TaskConfig, TaskLike } from "./types.ts";

function scope(uri: string) {
  return { uri: { toString: () => uri } };
}

function npmTask(script: string, path = "", name?: string, uri = "file:///repo"): TaskLike {
  return {
    name: name ?? (path ? `npm: ${script} - ${path}` : `npm: ${script}`),
    source: "npm",
    scope: scope(uri),
    definition: path ? { type: "npm", script, path } : { type: "npm", script },
  };
}

function shellTask(name: string, extra: Partial<TaskLike> = {}): TaskLike {
  return {
    name,
    source: "Workspace",
    scope: 2,
    definition: { type: "shell" },
    ...extra,
  };
}

test("npm path and workspace scope disambiguate duplicate scripts", () => {
  const tasks = [
    npmTask("build:watch", "modules/core"),
    npmTask("build:watch", "modules/server"),
    npmTask("build:watch", "modules/core", undefined, "file:///other"),
  ];
  const matched = matchTaskResult(
    tasks,
    { type: "npm", script: "build:watch", path: "modules/core" },
    { workspaceFolderUri: "file:///repo" },
  );
  assert.equal(matched.task?.definition.path, "modules/core");
  assert.equal(tasks.length, 3, "matching must not mutate the fetched task list");
});

test("equal top scores are ambiguous and never select the first task", () => {
  const tasks = [shellTask("build"), shellTask("build")];
  const result = matchTaskResult(tasks, { type: "shell", label: "build" });
  assert.equal(result.task, undefined);
  assert.equal(result.ambiguous, true);
  assert.equal(result.candidates.length, 2);
});

test("provider task is eligible only with workspace scope", () => {
  const config: TaskConfig = { type: "npm", script: "build", label: "build" };
  const workspace = npmTask("build", "", "build");
  const global: TaskLike = { ...workspace, scope: 1 };
  assert.ok(scoreMatch(workspace, config) > 0);
  assert.equal(scoreMatch(global, config), 0);
});

test("folder task sources require an exact public folder scope", () => {
  const task = shellTask("build", { scope: 2 });
  assert.equal(
    scoreMatch(task, { type: "shell", label: "build" }, { workspaceFolderUri: "file:///repo" }),
    0,
  );
});

test("shell and process definitions match by exact label", () => {
  const task = shellTask("build");
  assert.equal(matchTaskResult([task], { type: "process", label: "build" }).task, task);
  assert.equal(matchTaskResult([task], { type: "process", label: "publish" }).task, undefined);
});

test("sameTask requires source, definition, and scope", () => {
  const a = shellTask("build", { scope: scope("file:///repo/a") });
  const b = shellTask("build", { scope: scope("file:///repo/a") });
  const otherScope = shellTask("build", { scope: scope("file:///repo/b") });
  const otherDefinition = shellTask("build", { definition: { type: "shell", task: "other" } });
  const reordered = shellTask("build", { definition: { task: "build", type: "shell" } });
  const ordered = shellTask("build", { definition: { type: "shell", task: "build" } });
  assert.equal(sameTask(a, b), true);
  assert.equal(sameTask(a, otherScope), false);
  assert.equal(sameTask(a, otherDefinition), false);
  assert.equal(sameTask(reordered, ordered), true);
});

test("namesMatch accepts exact or provider-prefixed labels", () => {
  assert.equal(namesMatch("echo", "echo"), true);
  assert.equal(namesMatch("npm: hello", "hello"), true);
  assert.equal(namesMatch("build", "test"), false);
});
