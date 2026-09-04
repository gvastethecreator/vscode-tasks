import * as vscode from "vscode";
import { sameTask } from "./match.ts";
import { terminalNameMatchesTask } from "./taskTerminal.ts";

const terminalsByExecution = new Map<vscode.TaskExecution, vscode.Terminal>();
const pidsByExecution = new Map<vscode.TaskExecution, number>();
type FocusResult = "focused" | "unresolved" | "cancelled";

function matchingExecutions(task: vscode.Task): vscode.TaskExecution[] {
  return vscode.tasks.taskExecutions.filter((execution) => sameTask(execution.task, task));
}

function namedTerminals(taskName: string): vscode.Terminal[] {
  return vscode.window.terminals.filter((terminal) =>
    terminalNameMatchesTask(terminal.name, taskName),
  );
}

function uniqueNamedTerminal(taskName: string): vscode.Terminal | undefined {
  const terminals = namedTerminals(taskName);
  return terminals.length === 1 ? terminals[0] : undefined;
}

function uniqueExecutionByName(taskName: string): vscode.TaskExecution | undefined {
  const executions = vscode.tasks.taskExecutions.filter(
    (execution) => execution.task.name === taskName,
  );
  return executions.length === 1 ? executions[0] : undefined;
}

async function findTerminalByProcessId(pid: number): Promise<vscode.Terminal | undefined> {
  for (const terminal of vscode.window.terminals) {
    if ((await terminal.processId) === pid) {
      return terminal;
    }
  }
}

function bindUniqueNamedTerminals(): void {
  for (const execution of vscode.tasks.taskExecutions) {
    if (terminalsByExecution.has(execution)) {
      continue;
    }
    const terminal = uniqueNamedTerminal(execution.task.name);
    if (terminal && uniqueExecutionByName(execution.task.name) === execution) {
      terminalsByExecution.set(execution, terminal);
    }
  }
}

async function chooseTerminal(
  terminals: vscode.Terminal[],
  taskName: string,
): Promise<vscode.Terminal | undefined> {
  const choices = await Promise.all(
    terminals.map(async (terminal, index) => {
      const processId = await terminal.processId;
      return {
        label: terminal.name,
        description: "Terminal " + (index + 1),
        detail: processId ? "Process " + processId : undefined,
        terminal,
      };
    }),
  );
  const picked = await vscode.window.showQuickPick(choices, {
    title: "Choose terminal for " + taskName,
    placeHolder: "More than one terminal matches this task.",
  });
  return picked?.terminal;
}

function addTerminal(
  terminals: vscode.Terminal[],
  terminal: vscode.Terminal | undefined,
): void {
  if (terminal && !terminals.includes(terminal)) {
    terminals.push(terminal);
  }
}

async function mappedTerminals(
  executions: vscode.TaskExecution[],
): Promise<vscode.Terminal[]> {
  const terminals: vscode.Terminal[] = [];
  for (const execution of executions) {
    const pid = pidsByExecution.get(execution);
    if (pid === undefined) {
      continue;
    }
    const terminal = await findTerminalByProcessId(pid);
    if (terminal) {
      terminalsByExecution.set(execution, terminal);
      addTerminal(terminals, terminal);
    }
  }
  for (const execution of executions) {
    addTerminal(terminals, terminalsByExecution.get(execution));
  }
  return terminals;
}

async function showTerminalChoice(
  terminals: vscode.Terminal[],
  taskName: string,
): Promise<FocusResult> {
  if (terminals.length === 0) {
    return "unresolved";
  }
  const terminal = terminals.length === 1
    ? terminals[0]
    : await chooseTerminal(terminals, taskName);
  if (!terminal) {
    return "cancelled";
  }
  terminal.show();
  return "focused";
}

export function watchTaskTerminals(): vscode.Disposable {
  disposeTaskTerminalState();
  return vscode.Disposable.from(
    vscode.tasks.onDidStartTask((event) => {
      const terminal = uniqueNamedTerminal(event.execution.task.name);
      if (
        terminal &&
        uniqueExecutionByName(event.execution.task.name) === event.execution
      ) {
        terminalsByExecution.set(event.execution, terminal);
      }
    }),
    vscode.tasks.onDidStartTaskProcess((event) => {
      pidsByExecution.set(event.execution, event.processId);
      void findTerminalByProcessId(event.processId).then((terminal) => {
        if (terminal) {
          terminalsByExecution.set(event.execution, terminal);
        }
      });
    }),
    vscode.window.onDidOpenTerminal((terminal) => {
      const executions = vscode.tasks.taskExecutions.filter((execution) =>
        terminalNameMatchesTask(terminal.name, execution.task.name),
      );
      if (executions.length === 1 && uniqueNamedTerminal(executions[0].task.name) === terminal) {
        terminalsByExecution.set(executions[0], terminal);
      }
    }),
    vscode.window.onDidCloseTerminal((terminal) => {
      for (const [execution, mapped] of terminalsByExecution) {
        if (mapped === terminal) {
          terminalsByExecution.delete(execution);
        }
      }
    }),
    vscode.tasks.onDidEndTask((event) => {
      terminalsByExecution.delete(event.execution);
      pidsByExecution.delete(event.execution);
    }),
  );
}

export function disposeTaskTerminalState(): void {
  terminalsByExecution.clear();
  pidsByExecution.clear();
}

export function runTask(task: vscode.Task): void {
  vscode.tasks.executeTask(task).then(undefined, (error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    void vscode.window.showWarningMessage(message);
  });
}

export async function focusTask(task: vscode.Task): Promise<FocusResult> {
  bindUniqueNamedTerminals();
  const executions = matchingExecutions(task);
  const mapped = await mappedTerminals(executions);
  if (mapped.length > 0) {
    return showTerminalChoice(mapped, task.name);
  }
  return showTerminalChoice(namedTerminals(task.name), task.name);
}

export function runOrFocusTask(task: vscode.Task): void {
  if (matchingExecutions(task).length > 0) {
    void focusTask(task).then((result) => {
      if (result === "unresolved") {
        void vscode.window.showInformationMessage(
          "The task is running, but its terminal could not be identified.",
        );
      }
    });
  } else {
    runTask(task);
  }
}
