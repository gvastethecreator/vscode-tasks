import * as vscode from "vscode";
import {
  buildSnapshot,
  isTaskRunning,
  panelState,
  rememberSnapshot,
  runningTasks,
  type BuiltItem,
  type LoadSnapshot,
} from "./load.ts";
import { joinLabelEmoji, splitLabelEmoji } from "./emoji.ts";
import { disposeLog, log } from "./log.ts";
import { openSettingsPanel, postPanelState } from "./panel.ts";
import {
  isPanelMessageForKnownTask,
  parsePanelMessage,
  SUPPORT_URL,
  type PanelMessage,
} from "./panelState.ts";
import { DEFAULT_MENU_LABEL } from "./overflowButton.ts";
import {
  openTaskSource,
  resetStatusbarSettings,
  setDefaultStatusbarSettings,
  updateStatusbarSetting,
  updateTaskStatusbar,
} from "./persist.ts";
import { RefreshCoordinator } from "./refreshCoordinator.ts";
import {
  disposeTaskTerminalState,
  runOrFocusTask,
  watchTaskTerminals,
} from "./taskActions.ts";
import {
  applyRunningState,
  disposeStatusBar,
  OpenPanelCommand,
  RunTaskCommand,
  SelectTaskCommand,
  showTaskMenu,
  syncStatusBar,
} from "./statusBar.ts";

let items: BuiltItem[] = [];
let refreshTimer: ReturnType<typeof setTimeout> | undefined;
let coordinator: RefreshCoordinator<LoadSnapshot> | undefined;
let panelMessageQueue: Promise<void> = Promise.resolve();

function asTask(value: unknown): vscode.Task | undefined {
  if (value && typeof value === "object" && "name" in value && "definition" in value) {
    return value as vscode.Task;
  }
}

function applySnapshot(snapshot: LoadSnapshot): void {
  items = snapshot.items;
  rememberSnapshot(snapshot);
  syncStatusBar(items, snapshot.panel.hasWorkspace);
  postPanelState(snapshot.panel);
}

function reportRefreshFailure(error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  log("Failed to load tasks: " + message);
}

function requestRefresh(delay = 100): void {
  if (refreshTimer !== undefined) {
    clearTimeout(refreshTimer);
  }
  refreshTimer = setTimeout(() => {
    refreshTimer = undefined;
    coordinator?.request();
  }, delay);
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
        await updateStatusbarSetting("default.color", message.color || undefined);
        break;
      case "setLimit":
        await updateStatusbarSetting("limit", message.limit);
        break;
      case "setCompact":
        await updateStatusbarSetting("compact", message.enabled);
        break;
      case "setSelectLabel":
        await updateStatusbarSetting("select.label", message.label.trim() || DEFAULT_MENU_LABEL);
        break;
      case "setSelectShowLabel":
        await updateStatusbarSetting("select.showLabel", message.enabled);
        break;
      case "setSelectColor":
        await updateStatusbarSetting("select.color", message.color || undefined);
        break;
      case "setSelectIcon":
        await updateStatusbarSetting("select.icon", message.icon || undefined);
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
        const row = panelState().tasks.find((task) => task.key === message.key);
        const typed = splitLabelEmoji(message.label);
        const label = joinLabelEmoji(typed.emoji || row?.emoji || "", typed.text);
        await updateTaskStatusbar(message.key, { label });
        break;
      }
      case "setTaskEmoji": {
        const row = panelState().tasks.find((task) => task.key === message.key);
        const label = joinLabelEmoji(message.emoji, row?.label || row?.title || "");
        await updateTaskStatusbar(message.key, { label });
        break;
      }
      case "setTaskColor":
        await updateTaskStatusbar(message.key, { color: message.color.trim() });
        break;
      case "openTaskSource":
        await openTaskSource(message.key);
        return;
      case "resetSettings":
        await resetStatusbarSettings();
        break;
      case "setDefaults":
        await setDefaultStatusbarSettings();
        break;
      case "openUrl":
        if (message.url === SUPPORT_URL) {
          await vscode.env.openExternal(vscode.Uri.parse(SUPPORT_URL));
        }
        return;
    }
    requestRefresh(0);
  } catch (error) {
    const text = error instanceof Error ? error.message : String(error);
    log(text);
    await vscode.window.showErrorMessage(text);
  }
}

function receivePanelMessage(value: unknown): void {
  const message = parsePanelMessage(value);
  if (!message) {
    log("Ignored invalid settings panel message.");
    return;
  }
  if (!isPanelMessageForKnownTask(message, panelState().tasks)) {
    log("Ignored settings panel message for an unknown task.");
    return;
  }
  panelMessageQueue = panelMessageQueue.then(
    () => handlePanelMessage(message),
    () => handlePanelMessage(message),
  );
}

function isTaskSource(document: vscode.TextDocument): boolean {
  const path = document.uri.path.toLowerCase();
  if (path.endsWith("/.vscode/tasks.json")) {
    return true;
  }
  if (!path.endsWith(".code-workspace")) {
    return false;
  }
  const workspaceFile = vscode.workspace.workspaceFile;
  return workspaceFile?.path.toLowerCase().endsWith(".code-workspace") === true &&
    workspaceFile.toString() === document.uri.toString();
}

export function activate(context: vscode.ExtensionContext): void {
  coordinator = new RefreshCoordinator(buildSnapshot, applySnapshot, reportRefreshFailure);
  const taskWatcher = vscode.workspace.createFileSystemWatcher("**/.vscode/tasks.json");
  const workspaceFile = vscode.workspace.workspaceFile?.path.toLowerCase().endsWith(".code-workspace")
    ? vscode.workspace.workspaceFile
    : undefined;
  const workspaceWatcher = workspaceFile
    ? vscode.workspace.createFileSystemWatcher(
        new vscode.RelativePattern(
          vscode.Uri.joinPath(workspaceFile, ".."),
          "*.code-workspace",
        ),
      )
    : undefined;
  context.subscriptions.push(
    vscode.commands.registerCommand(RunTaskCommand, (value: unknown) => {
      const task = asTask(value);
      if (task) {
        runOrFocusTask(task);
      } else {
        log("Ignored invalid task command argument.");
      }
    }),
    vscode.commands.registerCommand(SelectTaskCommand, async () => {
      const value = await showTaskMenu();
      if (value?.type === "settings") {
        await vscode.commands.executeCommand(OpenPanelCommand);
      } else if (value?.type === "run") {
        runOrFocusTask(value.task);
      }
    }),
    vscode.commands.registerCommand(OpenPanelCommand, () => {
      openSettingsPanel(context, panelState, receivePanelMessage);
    }),
    vscode.commands.registerCommand("statusBarTasks.setDefaults", async () => {
      const confirm = "Set defaults";
      const choice = await vscode.window.showWarningMessage(
        "Set Status Bar Tasks defaults for all workspaces?",
        { modal: true },
        confirm,
      );
      if (choice !== confirm) {
        return;
      }
      await setDefaultStatusbarSettings();
      requestRefresh(0);
    }),
    watchTaskTerminals(),
    taskWatcher,
    taskWatcher.onDidCreate(() => requestRefresh()),
    taskWatcher.onDidChange(() => requestRefresh()),
    taskWatcher.onDidDelete(() => requestRefresh()),
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration("tasks.statusbar")) {
        requestRefresh();
      }
    }),
    vscode.workspace.onDidChangeWorkspaceFolders(() => requestRefresh()),
    vscode.workspace.onDidChangeTextDocument((event) => {
      if (isTaskSource(event.document)) {
        requestRefresh(180);
      }
    }),
    vscode.tasks.onDidStartTask((event) => {
      applyRunningState(
        event.execution.task,
        items,
        isTaskRunning(event.execution.task, runningTasks()),
      );
    }),
    vscode.tasks.onDidEndTask((event) => {
      applyRunningState(
        event.execution.task,
        items,
        isTaskRunning(
          event.execution.task,
          vscode.tasks.taskExecutions
            .filter((execution) => execution !== event.execution)
            .map((execution) => execution.task),
        ),
      );
    }),
  );
  if (workspaceWatcher) {
    context.subscriptions.push(
      workspaceWatcher,
      workspaceWatcher.onDidCreate(() => requestRefresh()),
      workspaceWatcher.onDidChange(() => requestRefresh()),
      workspaceWatcher.onDidDelete(() => requestRefresh()),
    );
  }
  requestRefresh(0);
}

export function deactivate(): void {
  if (refreshTimer !== undefined) {
    clearTimeout(refreshTimer);
    refreshTimer = undefined;
  }
  coordinator?.dispose();
  coordinator = undefined;
  disposeTaskTerminalState();
  disposeStatusBar();
  disposeLog();
}
