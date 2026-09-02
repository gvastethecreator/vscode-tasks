import * as vscode from "vscode";
import {
  formatStatusBarText,
  parseColor,
  resolveAttrs,
  runKindOf,
  runningStatusLabel,
  shouldShowForFile,
} from "./attributes.ts";
import { busyKind, overflowButtonText } from "./overflowButton.ts";
import type { BuiltItem } from "./load.ts";
import { readSettings } from "./load.ts";
import { sameTask } from "./match.ts";
import { runningItemText, showRunningIndicator } from "./runningControls.ts";
import type {
  ColorValue,
  ResolvedAttrs,
  RunKind,
  RunningControlSettings,
  StatusBarSettings,
} from "./types.ts";

export const RunTaskCommand = "statusBarTasks.run";
export const SelectTaskCommand = "statusBarTasks.select";
export const OpenPanelCommand = "statusBarTasks.openPanel";

const TASK_PRIORITY = 50;
const MENU_PRIORITY = 49;

type Slot = {
  item: vscode.StatusBarItem;
  built?: BuiltItem;
};

const slots: Slot[] = [];
let allItems: BuiltItem[] = [];
let workspaceActive = false;
let menu: vscode.StatusBarItem | undefined;
let editorListener: vscode.Disposable | undefined;

function applyColor(item: vscode.StatusBarItem, color: ColorValue | undefined): void {
  item.color = color
    ? color.type === "hex"
      ? color.value
      : new vscode.ThemeColor(color.value)
    : undefined;
}

function applyBackground(
  item: vscode.StatusBarItem,
  backgroundColor: string | undefined,
): void {
  item.backgroundColor =
    backgroundColor === "statusBarItem.errorBackground" ||
    backgroundColor === "statusBarItem.warningBackground"
      ? new vscode.ThemeColor(backgroundColor)
      : undefined;
}

function applyTooltip(
  item: vscode.StatusBarItem,
  attrs: ResolvedAttrs,
  sourceLabel: string,
): void {
  const detail = attrs.detail?.trim() || sourceLabel;
  const text = attrs.runKind
    ? runningStatusLabel(attrs.runKind) + ": " + detail
    : detail;
  item.tooltip = text;
}

function applyBuilt(
  slot: Slot,
  built: BuiltItem,
  runningSettings: RunningControlSettings,
): void {
  slot.built = built;
  slot.item.text = runningItemText(
    formatStatusBarText(built.attrs),
    showRunningIndicator(runningSettings, built.attrs.runKind !== undefined),
  );
  slot.item.name = "Status Bar Tasks: " + built.task.name;
  slot.item.accessibilityInformation = {
    label: built.attrs.runKind
      ? runningStatusLabel(built.attrs.runKind) + " task " + built.task.name
      : "Run task " + built.task.name,
  };
  slot.item.command = {
    command: RunTaskCommand,
    title: "Run " + built.task.name,
    arguments: [built.task],
  };
  applyColor(slot.item, built.attrs.color);
  applyBackground(slot.item, built.attrs.backgroundColor);
  applyTooltip(slot.item, built.attrs, built.sourceLabel);
}

function disposeSlot(slot: Slot): void {
  slot.item.hide();
  slot.item.dispose();
}

function ensureSlots(count: number): void {
  while (slots.length < count) {
    const index = slots.length;
    const item = vscode.window.createStatusBarItem(
      "statusBarTasks.pinned." + index,
      vscode.StatusBarAlignment.Left,
      TASK_PRIORITY,
    );
    slots.push({ item });
  }
  while (slots.length > count) {
    const slot = slots.pop();
    if (slot) {
      disposeSlot(slot);
    }
  }
}

function ensureMenu(): vscode.StatusBarItem {
  if (!menu) {
    menu = vscode.window.createStatusBarItem(
      "statusBarTasks.menu",
      vscode.StatusBarAlignment.Left,
      MENU_PRIORITY,
    );
    menu.name = "Status Bar Tasks";
    menu.command = SelectTaskCommand;
    menu.tooltip = "Run a workspace task or open settings";
    menu.accessibilityInformation = { label: "Open Status Bar Tasks menu" };
  }
  return menu;
}

function activeRelativePath(item: BuiltItem): string | undefined {
  const uri = vscode.window.activeTextEditor?.document.uri;
  if (!uri) {
    return;
  }
  const folder = vscode.workspace.getWorkspaceFolder(uri);
  if (
    item.identity.workspaceFolderUri &&
    folder?.uri.toString() !== item.identity.workspaceFolderUri
  ) {
    return;
  }
  return vscode.workspace.asRelativePath(uri, false).replaceAll("\\", "/");
}

function appliesToActiveFile(item: BuiltItem): boolean {
  return shouldShowForFile(item.attrs.fileGlob, activeRelativePath(item));
}

function executionTasks(): vscode.Task[] {
  return vscode.tasks.taskExecutions.map((execution) => execution.task);
}

function isRunningNow(task: vscode.Task): boolean {
  return executionTasks().some((candidate) => sameTask(candidate, task));
}

function itemRunKind(item: BuiltItem): RunKind {
  return runKindOf(item.config, item.task);
}

function currentBusyKind() {
  const kinds: RunKind[] = [];
  for (const item of allItems) {
    if (isRunningNow(item.task)) {
      kinds.push(itemRunKind(item));
    }
  }
  return busyKind(kinds);
}

function visiblePinnedItems(settings: StatusBarSettings): BuiltItem[] {
  if (settings.compact || settings.limit === 0) {
    return [];
  }
  return allItems
    .filter((item) => !item.attrs.hide && appliesToActiveFile(item))
    .slice(0, settings.limit);
}

export function updateVisibility(): void {
  const settings = readSettings();
  if (allItems.length === 0) {
    for (const slot of slots) {
      slot.item.hide();
    }
    if (workspaceActive) {
      const menuItem = ensureMenu();
      menuItem.text = overflowButtonText({
        compact: settings.compact,
        icon: settings.select.icon,
        label: settings.select.label,
      });
      applyColor(menuItem, parseColor(settings.select.color));
      menuItem.show();
    } else {
      menu?.hide();
    }
    return;
  }

  const pinned = visiblePinnedItems(settings);
  ensureSlots(pinned.length);
  for (let index = 0; index < pinned.length; index += 1) {
    applyBuilt(slots[index], pinned[index], settings.running);
    slots[index].item.show();
  }

  const busy = currentBusyKind();
  const menuItem = ensureMenu();
  const menuText = overflowButtonText({
    compact: settings.compact,
    icon: settings.select.icon,
    label: settings.select.label,
    busy,
  });
  menuItem.text = runningItemText(
    menuText,
    settings.compact && showRunningIndicator(settings.running, busy !== undefined),
  );
  applyColor(menuItem, parseColor(settings.select.color));
  menuItem.show();
}

function listenToEditor(): void {
  if (!editorListener) {
    editorListener = vscode.window.onDidChangeActiveTextEditor(updateVisibility);
  }
}

export function syncStatusBar(items: BuiltItem[], hasWorkspace = true): void {
  allItems = items;
  workspaceActive = hasWorkspace;
  listenToEditor();
  updateVisibility();
}

export function applyRunningState(
  task: vscode.Task,
  items: BuiltItem[],
  running: boolean,
): void {
  const settings = readSettings();
  for (const item of items) {
    if (!sameTask(item.task, task)) {
      continue;
    }
    item.attrs = resolveAttrs(
      item.config,
      item.task,
      settings.defaults,
      running,
      settings.running.highlight,
    );
  }
  allItems = items;
  updateVisibility();
}

export type OverflowPick = vscode.QuickPickItem & {
  task?: vscode.Task;
  openSettings?: boolean;
};

export type OverflowResult =
  | { type: "run"; task: vscode.Task }
  | { type: "settings" };

export function overflowPicks(): OverflowPick[] {
  const settings = readSettings();
  const picks: OverflowPick[] = [];
  for (const item of allItems) {
    if (!appliesToActiveFile(item)) {
      continue;
    }
    const running = isRunningNow(item.task);
    const status = running ? runningStatusLabel(itemRunKind(item)) : undefined;
    picks.push({
      label: runningItemText(
        formatStatusBarText(item.attrs),
        showRunningIndicator(settings.running, running),
      ),
      description: status
        ? status + " · " + item.sourceLabel
        : item.sourceLabel,
      detail: item.attrs.detail,
      task: item.task,
    });
  }
  if (picks.length > 0) {
    picks.push({ label: "", kind: vscode.QuickPickItemKind.Separator });
  }
  picks.push({
    label: "$(gear) Open Status Bar Tasks Settings",
    openSettings: true,
  });
  return picks;
}

export function showTaskMenu(): Promise<OverflowResult | undefined> {
  return new Promise((resolve) => {
    const quickPick = vscode.window.createQuickPick<OverflowPick>();
    quickPick.placeholder = "Run a workspace task or open settings";
    quickPick.items = overflowPicks();
    quickPick.matchOnDescription = true;
    quickPick.matchOnDetail = true;
    let settled = false;
    const finish = (value: OverflowResult | undefined): void => {
      if (settled) {
        return;
      }
      settled = true;
      quickPick.hide();
      quickPick.dispose();
      resolve(value);
    };
    quickPick.onDidAccept(() => {
      const pick = quickPick.selectedItems[0];
      if (pick?.openSettings) {
        finish({ type: "settings" });
      } else if (pick?.task) {
        finish({ type: "run", task: pick.task });
      } else {
        finish(undefined);
      }
    });
    quickPick.onDidHide(() => finish(undefined));
    quickPick.show();
  });
}

export function disposeStatusBar(): void {
  for (const slot of slots) {
    disposeSlot(slot);
  }
  slots.length = 0;
  allItems = [];
  workspaceActive = false;
  menu?.hide();
  menu?.dispose();
  menu = undefined;
  editorListener?.dispose();
  editorListener = undefined;
}
