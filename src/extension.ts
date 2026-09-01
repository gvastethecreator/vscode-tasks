import * as vscode from "vscode";
import { joinLabelEmoji, splitLabelEmoji } from "./emoji.ts";
import { buildItems, isTaskRunning, listPanelTasks, panelState, runningTasks } from "./load.ts";
import { disposeLog, log } from "./log.ts";
import { openSettingsPanel, postPanelState } from "./panel.ts";
import type { PanelMessage } from "./panelState.ts";
import { SUPPORT_URL } from "./panelState.ts";
import {
  openTaskSource,
  resetStatusbarSettings,
  updateStatusbarSetting,
  updateTaskStatusbar,
} from "./persist.ts";
import { runOrFocusTask, watchTaskTerminals } from "./taskActions.ts";
import {
  applyRunningState,
  disposeStatusBar,
  OpenPanelCommand,
  RunTaskCommand,
  SelectTaskCommand,
  showTaskMenu,
  syncStatusBar,
  taskAtIndex,
} from "./statusBar.ts";
import type { BuiltItem } from "./load.ts";

const MinimumFetchInterval = 1000;

let items: BuiltItem[] = [];
let fetchLastTime = 0;
let fetchTimer: ReturnType<typeof setTimeout> | undefined;

function asTask(args: unknown): vscode.Task | undefined {
  if (typeof args === "number") {
    return taskAtIndex(args - 1);
  }
  if (args && typeof args === "object" && "name" in args) {
    return args as vscode.Task;
  }
}

async function loadTasks(): Promise<void> {
  try {
    items = await buildItems();
    syncStatusBar(items);
    postPanelState(panelState());
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log(`Failed to load tasks: ${message}`);
  }
}

function loadTasksDelay(timeout: number): void {
  if (fetchTimer !== undefined) {
    clearTimeout(fetchTimer);
  }
  fetchTimer = setTimeout(() => {
    fetchTimer = undefined;
    fetchLastTime = Date.now();
    void loadTasks();
  }, timeout);
}

function loadTasksWait(): void {
  const now = Date.now();
  if (now < fetchLastTime + MinimumFetchInterval) {
    loadTasksDelay(MinimumFetchInterval);
    return;
  }
  if (fetchTimer === undefined) {
    fetchLastTime = now;
    void loadTasks();
  }
}

async function handlePanelMessage(message: PanelMessage): Promise<void> {
  try {
    switch (message.type) {
      case "ready":
        postPanelState(panelState());
        return;
      case "setDefaultHide":
        await updateStatusbarSetting("default.hide", message.enabled);
        break;
      case "setDefaultColor":
        await updateStatusbarSetting(
          "default.color",
          message.color.length > 0 ? message.color : undefined,
        );
        break;
      case "setLimit":
        await updateStatusbarSetting("limit", message.limit);
        break;
      case "setCompact":
        await updateStatusbarSetting("compact", message.enabled);
        break;
      case "setSelectLabel":
        await updateStatusbarSetting(
          "select.label",
          message.label.trim() || "...",
        );
        break;
      case "setSelectColor":
        await updateStatusbarSetting(
          "select.color",
          message.color.length > 0 ? message.color : undefined,
        );
        break;
      case "setSelectIcon":
        await updateStatusbarSetting(
          "select.icon",
          message.icon.trim() || undefined,
        );
        break;
      case "setRunningIndicator":
        await updateStatusbarSetting("running.indicator", message.enabled);
        break;
      case "setRunningHighlight":
        await updateStatusbarSetting("running.highlight", message.enabled);
        break;
      case "setTaskHide":
        await updateTaskStatusbar(message.key, { hide: message.hide });
        break;
      case "setTaskLabel": {
        const row = listPanelTasks().find((task) => task.key === message.key);
        const typed = splitLabelEmoji(message.label);
        const label = joinLabelEmoji(typed.emoji || row?.emoji || "", typed.text);
        await updateTaskStatusbar(message.key, { label });
        break;
      }
      case "setTaskEmoji": {
        const row = listPanelTasks().find((task) => task.key === message.key);
        const text = (row?.label ?? "").trim() || splitLabelEmoji(row?.title ?? "").text;
        const label = joinLabelEmoji(message.emoji, text);
        await updateTaskStatusbar(message.key, { label });
        break;
      }
      case "setTaskColor":
        await updateTaskStatusbar(message.key, { color: message.color });
        break;
      case "openTaskSource":
        await openTaskSource(message.key);
        return;
      case "resetSettings":
        await resetStatusbarSettings();
        break;
      case "openUrl":
        if (message.url === SUPPORT_URL) {
          await vscode.env.openExternal(vscode.Uri.parse(SUPPORT_URL));
        }
        return;
    }
    await loadTasks();
  } catch (err) {
    const text = err instanceof Error ? err.message : String(err);
    log(text);
    await vscode.window.showErrorMessage(text);
  }
}

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand(RunTaskCommand, (args: unknown) => {
      const task = asTask(args);
      if (task) {
        runOrFocusTask(task);
        return;
      }
      log(`Invalid task: ${args}`);
    }),
    vscode.commands.registerCommand(SelectTaskCommand, async () => {
      const value = await showTaskMenu();
      if (!value) {
        return;
      }
      if (value.type === "settings") {
        await vscode.commands.executeCommand(OpenPanelCommand);
        return;
      }
      runOrFocusTask(value.task);
    }),
    watchTaskTerminals(),
    vscode.commands.registerCommand(OpenPanelCommand, () => {
      openSettingsPanel(context, panelState, handlePanelMessage);
    }),
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration("tasks")) {
        loadTasksWait();
      }
    }),
    vscode.workspace.onDidChangeWorkspaceFolders(() => {
      loadTasksWait();
    }),
    vscode.tasks.onDidStartTask((event) => {
      applyRunningState(
        event.execution.task,
        items,
        isTaskRunning(event.execution.task, runningTasks()),
      );
    }),
    vscode.tasks.onDidEndTask((event) => {
      applyRunningState(event.execution.task, items, false);
    }),
  );
  loadTasksDelay(0);
}

export function deactivate(): void {
  if (fetchTimer !== undefined) {
    clearTimeout(fetchTimer);
    fetchTimer = undefined;
  }
  disposeStatusBar();
  disposeLog();
}
