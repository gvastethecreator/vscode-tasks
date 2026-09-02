const assert = require("node:assert/strict");
const vscode = require("vscode");

function withTimeout(promise, label, timeout = 15000) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(label + " timed out.")), timeout);
    }),
  ]).finally(() => clearTimeout(timer));
}

function nextTaskEvent(subscribe, predicate, label) {
  return withTimeout(
    new Promise((resolve) => {
      const disposable = subscribe((event) => {
        if (predicate(event)) {
          disposable.dispose();
          resolve(event);
        }
      });
    }),
    label,
  );
}

async function assertSchemaHasNoErrors(uri) {
  const document = await vscode.workspace.openTextDocument(uri);
  await vscode.window.showTextDocument(document, { preview: true });
  await new Promise((resolve) => setTimeout(resolve, 1200));
  const errors = vscode.languages
    .getDiagnostics(uri)
    .filter((diagnostic) => diagnostic.severity === vscode.DiagnosticSeverity.Error);
  assert.deepEqual(
    errors.map((error) => error.message),
    [],
    "Task schema must coexist with built-in validation.",
  );
}

async function assertRunningCommandFocuses(task) {
  const started = nextTaskEvent(
    vscode.tasks.onDidStartTask,
    (event) => event.execution.task.name === task.name,
    "Background task start",
  );
  const ended = nextTaskEvent(
    vscode.tasks.onDidEndTask,
    (event) => event.execution.task.name === task.name,
    "Background task end",
  );
  await vscode.commands.executeCommand("statusBarTasks.run", task);
  const event = await started;
  try {
    await new Promise((resolve) => setTimeout(resolve, 350));
    let executions = vscode.tasks.taskExecutions.filter(
      (execution) => execution.task.name === task.name,
    );
    assert.equal(
      executions.length,
      1,
      "The first click must start one task execution.",
    );
    assert.equal(
      executions[0],
      event.execution,
      "The first click must keep its original execution active.",
    );
    await vscode.commands.executeCommand("statusBarTasks.run", task);
    await new Promise((resolve) => setTimeout(resolve, 350));
    executions = vscode.tasks.taskExecutions.filter(
      (execution) => execution.task.name === task.name,
    );
    assert.equal(
      executions.length,
      1,
      "A click on a running task must not start another execution.",
    );
    assert.equal(
      executions[0],
      event.execution,
      "A click on a running task must keep the original execution active.",
    );
  } finally {
    if (vscode.tasks.taskExecutions.includes(event.execution)) {
      event.execution.terminate();
    }
    await ended;
  }
}

async function run() {
  const extension = vscode.extensions.getExtension(
    "gvastethecreator.status-bar-tasks",
  );
  assert.ok(extension, "Development extension was not discovered.");
  await extension.activate();
  assert.equal(extension.isActive, true);

  assert.equal(vscode.workspace.workspaceFolders?.length, 2);
  const commands = await vscode.commands.getCommands(true);
  assert.ok(commands.includes("statusBarTasks.select"));
  assert.ok(commands.includes("statusBarTasks.openPanel"));

  const tasks = await vscode.tasks.fetchTasks();
  for (const name of [
    "echo",
    "process-echo",
    "all-echoes",
    "workspace-echo",
    "server",
  ]) {
    assert.ok(tasks.some((task) => task.name === name), "Missing task: " + name);
  }
  assert.ok(tasks.some((task) => task.definition.type === "npm"));
  assert.ok(tasks.some((task) => task.name === "server" && task.isBackground));

  const echo = tasks.find((task) => task.name === "echo");
  assert.ok(echo);
  const started = nextTaskEvent(
    vscode.tasks.onDidStartTask,
    (event) => event.execution.task.name === "echo",
    "Task start",
  );
  const ended = nextTaskEvent(
    vscode.tasks.onDidEndTask,
    (event) => event.execution.task.name === "echo",
    "Task end",
  );
  await vscode.tasks.executeTask(echo);
  await started;
  await ended;

  const server = tasks.find((task) => task.name === "server");
  assert.ok(server);
  await assertRunningCommandFocuses(server);

  const root = vscode.workspace.workspaceFolders.find(
    (folder) => folder.name === "fixture",
  );
  assert.ok(root);
  await assertSchemaHasNoErrors(
    vscode.Uri.joinPath(root.uri, ".vscode", "tasks.json"),
  );
  assert.ok(vscode.workspace.workspaceFile);
  await assertSchemaHasNoErrors(vscode.workspace.workspaceFile);

  await vscode.commands.executeCommand("statusBarTasks.openPanel");
  await vscode.commands.executeCommand("workbench.action.closeActiveEditor");
}

module.exports = { run };
