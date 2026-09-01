import assert from "node:assert/strict";
import { test } from "node:test";
import {
  collectFetchTypes,
  matchTask,
  namesMatch,
  sameTask,
  scoreMatch,
} from "./match.ts";
import type { TaskConfig, TaskLike } from "./types.ts";

function npmTask(
  script: string,
  path = "",
  name?: string,
): TaskLike {
  return {
    name: name ?? (path ? `npm: ${script} - ${path}` : `npm: ${script}`),
    source: "Workspace",
    definition: path
      ? { type: "npm", script, path }
      : { type: "npm", script },
  };
}

function shellTask(name: string, extra: Partial<TaskLike> = {}): TaskLike {
  return {
    name,
    source: "Workspace",
    definition: { type: "shell" },
    ...extra,
  };
}

test("npm tasks with the same script and different path stay distinct", () => {
  const tasks = [
    npmTask("build:watch", "modules/core"),
    npmTask("build:watch", "modules/server"),
  ];
  const first = matchTask(tasks, {
    type: "npm",
    script: "build:watch",
    path: "modules/core",
    label: "build:core",
  });
  const second = matchTask(tasks, {
    type: "npm",
    script: "build:watch",
    path: "modules/server",
    label: "build:server",
  });
  assert.equal(first?.definition.path, "modules/core");
  assert.equal(second?.definition.path, "modules/server");
  assert.equal(tasks.length, 0);
});

test("npm tasks with the same script match cwd when path is omitted on the config", () => {
  const tasks = [
    npmTask("build:watch", "modules/core", "build:core"),
    npmTask("build:watch", "modules/server", "build:server"),
  ];
  const first = matchTask(tasks, {
    type: "npm",
    script: "build:watch",
    label: "build:core",
    options: { cwd: "./modules/core" },
  });
  const second = matchTask(tasks, {
    type: "npm",
    script: "build:watch",
    label: "build:server",
    options: { cwd: "./modules/server" },
  });
  assert.equal(first?.name, "build:core");
  assert.equal(second?.name, "build:server");
});

test("labeled npm tasks match Task.name even when definition.path is empty", () => {
  const tasks = [
    npmTask("build:watch", "", "build:core"),
    npmTask("build:watch", "", "build:server"),
  ];
  const first = matchTask(tasks, {
    type: "npm",
    script: "build:watch",
    label: "build:core",
    options: { cwd: "./modules/core" },
  });
  const second = matchTask(tasks, {
    type: "npm",
    script: "build:watch",
    label: "build:server",
    options: { cwd: "./modules/server" },
  });
  assert.equal(first?.name, "build:core");
  assert.equal(second?.name, "build:server");
});

test("shell tasks match by label and public definition type", () => {
  const tasks = [shellTask("build"), shellTask("publish")];
  const matched = matchTask(tasks, {
    type: "process",
    label: "build",
    command: "dotnet",
  });
  assert.equal(matched?.name, "build");
  assert.equal(tasks[0]?.name, "publish");
});

test("sameTask uses name, definition, and scope instead of private ids", () => {
  const a = shellTask("build", { scope: { uri: { fsPath: "/repo/a" } } });
  const b = shellTask("build", { scope: { uri: { fsPath: "/repo/a" } } });
  const c = shellTask("build", { scope: { uri: { fsPath: "/repo/b" } } });
  assert.equal(sameTask(a, b), true);
  assert.equal(sameTask(a, c), false);
  assert.equal(
    sameTask(shellTask("build"), shellTask("build", { scope: { uri: { fsPath: "/repo/a" } } })),
    true,
  );
  const npmA = npmTask("hello", "nested");
  const npmB = npmTask("hello", "nested", "npm nested");
  const npmC = npmTask("hello", "");
  assert.equal(sameTask(npmA, npmB), true);
  assert.equal(sameTask(npmA, npmC), false);
});

test("collectFetchTypes uses config types and compound tasks", () => {
  const types = collectFetchTypes([
    { type: "npm", script: "build" },
    { label: "plain" },
    { label: "all", dependsOn: ["plain"] },
  ]);
  assert.deepEqual(new Set(types), new Set(["npm", "process", "$composite"]));
});

test("namesMatch accepts an exact label or a provider prefix", () => {
  assert.equal(namesMatch("echo", "echo"), true);
  assert.equal(namesMatch("npm: hello", "hello"), true);
  assert.equal(namesMatch("build", "test"), false);
});

test("shell config matches a workspace task whose definition type is $empty", () => {
  const tasks = [
    {
      name: "echo",
      source: "Workspace",
      definition: { type: "$empty" },
    },
  ];
  const matched = matchTask(tasks, {
    type: "shell",
    label: "echo",
    command: "echo",
  });
  assert.equal(matched?.name, "echo");
});

test("non-workspace tasks score zero", () => {
  const config: TaskConfig = { type: "shell", label: "build" };
  const task: TaskLike = {
    name: "build",
    source: "Workspace",
    definition: { type: "shell" },
  };
  const npm: TaskLike = {
    name: "build",
    source: "npm",
    definition: { type: "shell" },
  };
  assert.ok(scoreMatch(task, config) > 0);
  assert.equal(scoreMatch(npm, config), 0);
});
