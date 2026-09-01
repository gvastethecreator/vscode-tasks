import * as vscode from "vscode";
import { findMatchingTask } from "./match.ts";
import { terminalNameMatchesTask } from "./taskTerminal.ts";

const terminalsByExecution = new Map<vscode.TaskExecution, vscode.Terminal>();
const pidsByExecution = new Map<vscode.TaskExecution, number>();

function matchingExecutions(task: vscode.Task): vscode.TaskExecution[] {
  return vscode.tasks.taskExecutions.filter(
    (execution) => findMatchingTask([execution.task], task) === execution.task,
  );
}

function rememberTerminal(
  execution: vscode.TaskExecution,
  terminal: vscode.Terminal,
): void {
  terminalsByExecution.set(execution, terminal);
}

function findTerminalByName(taskName: string): vscode.Terminal | undefined {
  const matches = vscode.window.terminals.filter((terminal) =>
    terminalNameMatchesTask(terminal.name, taskName),
  );
  return matches.at(-1);
}

async function findTerminalByProcessId(
  pid: number,
): Promise<vscode.Terminal | undefined> {
  for (const terminal of vscode.window.terminals) {
    if ((await terminal.processId) === pid) {
      return terminal;
    }
  }
}

function bindOpenTerminals(): void {
  for (const execution of vscode.tasks.taskExecutions) {
    if (terminalsByExecution.has(execution)) {
      continue;
    }
    const terminal = findTerminalByName(execution.task.name);
    if (terminal) {
      rememberTerminal(execution, terminal);
    }
  }
}

export function watchTaskTerminals(): vscode.Disposable {
  return vscode.Disposable.from(
    vscode.tasks.onDidStartTask((event) => {
      const terminal = findTerminalByName(event.execution.task.name);
      if (terminal) {
        rememberTerminal(event.execution, terminal);
      }
    }),
    vscode.tasks.onDidStartTaskProcess((event) => {
      pidsByExecution.set(event.execution, event.processId);
      const named = findTerminalByName(event.execution.task.name);
      if (named) {
        rememberTerminal(event.execution, named);
      }
      void findTerminalByProcessId(event.processId).then((terminal) => {
        if (terminal) {
          rememberTerminal(event.execution, terminal);
        }
      });
    }),
    vscode.window.onDidOpenTerminal((terminal) => {
      for (const execution of vscode.tasks.taskExecutions) {
        if (
          !terminalsByExecution.has(execution) &&
          terminalNameMatchesTask(terminal.name, execution.task.name)
        ) {
          rememberTerminal(execution, terminal);
        }
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

export function runTask(task: vscode.Task): void {
  vscode.tasks.executeTask(task).then(undefined, (err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    vscode.window.showWarningMessage(message);
  });
}

export async function focusTask(task: vscode.Task): Promise<boolean> {
  bindOpenTerminals();
  for (const execution of matchingExecutions(task)) {
    const mapped = terminalsByExecution.get(execution);
    if (mapped) {
      mapped.show();
      return true;
    }
    const pid = pidsByExecution.get(execution);
    if (pid !== undefined) {
      const terminal = await findTerminalByProcessId(pid);
      if (terminal) {
        rememberTerminal(execution, terminal);
        terminal.show();
        return true;
      }
    }
  }
  const byName = findTerminalByName(task.name);
  if (byName) {
    byName.show();
    return true;
  }
  return false;
}

export function runOrFocusTask(task: vscode.Task): void {
  if (matchingExecutions(task).length > 0) {
    void focusTask(task);
    return;
  }
  runTask(task);
}
