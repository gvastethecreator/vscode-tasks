import * as vscode from "vscode";
import {
  parseColor,
  resolveAttrs,
  runKindOf,
  runningStatusLabel,
  shouldShowForFile,
} from "./attributes.ts";
import { busyKind, overflowButtonText } from "./overflowButton.ts";
import type { BuiltItem } from "./load.ts";
import { readSettings } from "./load.ts";
import { findMatchingTask } from "./match.ts";
import { runningItemText, showRunningIndicator } from "./runningControls.ts";
import type { ColorValue, ResolvedAttrs, RunKind, TaskConfig } from "./types.ts";

export const RunTaskCommand = "statusBarTasks.run";
export const SelectTaskCommand = "statusBarTasks.select";
export const OpenPanelCommand = "statusBarTasks.openPanel";

const TASK_PRIORITY = 50;
const OVERFLOW_PRIORITY = 49;
const COMPACT_INDICATOR_PRIORITY = 49.5;

type Slot = {
  item: vscode.StatusBarItem;
  label: string;
  filePattern?: string;
  task?: vscode.Task;
  config?: TaskConfig;
};

const slots: Slot[] = [];
const overflowTasks: {
  label: string;
  description?: string;
  task: vscode.Task;
}[] = [];
let overflow: vscode.StatusBarItem | undefined;
let compactIndicator: vscode.StatusBarItem | undefined;
let editorListener: vscode.Disposable | undefined;

function applyColor(
  item: vscode.StatusBarItem,
  color: ColorValue | undefined,
): void {
  if (!color) {
    item.color = undefined;
    return;
  }
  item.color =
    color.type === "hex" ? color.value : new vscode.ThemeColor(color.value);
}

function applyBackground(
  item: vscode.StatusBarItem,
  backgroundColor: string | undefined,
): void {
  if (
    backgroundColor === "statusBarItem.errorBackground" ||
    backgroundColor === "statusBarItem.warningBackground"
  ) {
    item.backgroundColor = new vscode.ThemeColor(backgroundColor);
    return;
  }
  item.backgroundColor = undefined;
}

function applyTooltip(
  item: vscode.StatusBarItem,
  detail: string | undefined,
): void {
  if (!detail) {
    item.tooltip = undefined;
    return;
  }
  const md = new vscode.MarkdownString(detail);
  md.supportThemeIcons = true;
  item.tooltip = md;
}

function applyAttrs(slot: Slot, attrs: ResolvedAttrs): void {
  slot.label = attrs.label;
  slot.item.text = attrs.label;
  slot.item.name = "Status Bar Tasks";
  applyColor(slot.item, attrs.color);
  applyBackground(slot.item, attrs.backgroundColor);
  applyTooltip(slot.item, attrs.detail);
}

function disposeSlot(slot: Slot): void {
  slot.item.hide();
  slot.item.dispose();
}

function ensureSlots(count: number): void {
  while (slots.length < count) {
    const index = slots.length;
    const item = vscode.window.createStatusBarItem(
      `statusBarTasks.${index}`,
      vscode.StatusBarAlignment.Left,
      TASK_PRIORITY,
    );
    slots.push({ item, label: "" });
  }
  while (slots.length > count) {
    const slot = slots.pop();
    if (slot) {
      disposeSlot(slot);
    }
  }
}

function ensureOverflow(): vscode.StatusBarItem {
  if (!overflow) {
    overflow = vscode.window.createStatusBarItem(
      "statusBarTasks.overflow",
      vscode.StatusBarAlignment.Left,
      OVERFLOW_PRIORITY,
    );
    overflow.name = "Status Bar Tasks";
    overflow.command = SelectTaskCommand;
    overflow.tooltip = "Run a task or open settings";
  }
  return overflow;
}

function ensureCompactIndicator(): vscode.StatusBarItem {
  if (!compactIndicator) {
    compactIndicator = vscode.window.createStatusBarItem(
      "statusBarTasks.compactIndicator",
      vscode.StatusBarAlignment.Left,
      COMPACT_INDICATOR_PRIORITY,
    );
    compactIndicator.name = "Status Bar Tasks";
    compactIndicator.text = "🟢";
    compactIndicator.command = SelectTaskCommand;
    compactIndicator.tooltip = "A task is running";
  }
  return compactIndicator;
}

function currentFilePath(): string | undefined {
  return vscode.window.activeTextEditor?.document.fileName;
}

function executionTasks(): vscode.Task[] {
  return vscode.tasks.taskExecutions.map((execution) => execution.task);
}

function isRunningNow(task: vscode.Task): boolean {
  return Boolean(findMatchingTask(executionTasks(), task));
}

function slotRunKind(slot: Slot): RunKind {
  return runKindOf(slot.config ?? {}, slot.task);
}

function slotBusy() {
  const kinds: RunKind[] = [];
  for (const slot of slots) {
    if (slot.task && isRunningNow(slot.task)) {
      kinds.push(slotRunKind(slot));
    }
  }
  return busyKind(kinds);
}

function applyRunningLabel(slot: Slot): void {
  if (!slot.task) {
    slot.item.text = slot.label;
    return;
  }
  slot.item.text = runningItemText(
    slot.label,
    showRunningIndicator(readSettings().running, isRunningNow(slot.task)),
  );
}

export function updateVisibility(): void {
  const filePath = currentFilePath();
  const settings = readSettings();
  overflowTasks.length = 0;
  let shown = 0;
  const limit = settings.compact ? 0 : settings.limit;
  for (const slot of slots) {
    slot.item.hide();
    if (!slot.task || !shouldShowForFile(slot.filePattern, filePath)) {
      continue;
    }
    if (typeof limit === "number" && limit <= shown) {
      overflowTasks.push({
        label: slot.item.text,
        description:
          typeof slot.item.tooltip === "string"
            ? slot.item.tooltip
            : slot.item.tooltip?.value,
        task: slot.task,
      });
      continue;
    }
    slot.item.show();
    applyRunningLabel(slot);
    shown += 1;
  }

  if (slots.length > 0) {
    const item = ensureOverflow();
    item.text = overflowButtonText({
      compact: settings.compact,
      icon: settings.select.icon,
      label: settings.select.label,
      busy: slotBusy(),
    });
    applyColor(item, parseColor(settings.select.color));
    item.show();
  } else {
    overflow?.hide();
  }

  const anyRunning = slots.some((slot) => slot.task && isRunningNow(slot.task));
  if (
    settings.compact &&
    slots.length > 0 &&
    showRunningIndicator(settings.running, anyRunning)
  ) {
    const item = ensureCompactIndicator();
    const busy = slotBusy();
    item.tooltip =
      busy === "background" ? "A task is online" : "A task is running";
    item.show();
  } else {
    compactIndicator?.hide();
  }
}

function listenToEditor(): void {
  if (!editorListener) {
    editorListener = vscode.window.onDidChangeActiveTextEditor(updateVisibility);
  }
}

export function syncStatusBar(items: BuiltItem[]): void {
  if (items.length === 0) {
    disposeStatusBar();
    return;
  }
  ensureSlots(items.length);
  for (let i = 0; i < items.length; i++) {
    const built = items[i];
    const slot = slots[i];
    slot.task = built.task;
    slot.config = built.config;
    slot.filePattern = built.attrs.filePattern;
    applyAttrs(slot, built.attrs);
    slot.item.command = {
      command: RunTaskCommand,
      title: built.attrs.label,
      arguments: [built.task],
    };
  }
  listenToEditor();
  updateVisibility();
}

export function applyRunningState(
  task: vscode.Task,
  items: BuiltItem[],
  running: boolean,
): void {
  const matchedTask = findMatchingTask(
    items.map((item) => item.task),
    task,
  );
  const item = items.find((entry) => entry.task === matchedTask);
  const slot = slots.find(
    (candidate) => candidate.task && candidate.task === matchedTask,
  );
  if (item && slot) {
    item.attrs = resolveAttrs(
      item.config,
      item.task,
      readSettings().defaults,
      running,
      readSettings().running.highlight,
    );
    applyAttrs(slot, item.attrs);
  }
  updateVisibility();
}

export function taskAtIndex(index: number): vscode.Task | undefined {
  return slots[index]?.task;
}

export type OverflowPick = vscode.QuickPickItem & {
  task?: vscode.Task;
  openSettings?: boolean;
};

export type OverflowResult =
  | { type: "run"; task: vscode.Task }
  | { type: "settings" };

function slotTooltip(slot: Slot): string | undefined {
  if (typeof slot.item.tooltip === "string") {
    return slot.item.tooltip;
  }
  return slot.item.tooltip?.value;
}

export function overflowPicks(): OverflowPick[] {
  const filePath = currentFilePath();
  const runningSettings = readSettings().running;
  const picks: OverflowPick[] = [];
  for (const slot of slots) {
    if (!slot.task || !shouldShowForFile(slot.filePattern, filePath)) {
      continue;
    }
    const running = isRunningNow(slot.task);
    picks.push({
      label: runningItemText(
        slot.label,
        showRunningIndicator(runningSettings, running),
      ),
      description: running
        ? runningStatusLabel(slotRunKind(slot))
        : slotTooltip(slot),
      task: slot.task,
    });
  }
  if (picks.length > 0) {
    picks.push({
      label: "",
      kind: vscode.QuickPickItemKind.Separator,
    });
  }
  picks.push({
    label: "$(gear) Open Status Bar Tasks Settings",
    openSettings: true,
  });
  return picks;
}

export function showTaskMenu(): Promise<OverflowResult | undefined> {
  return new Promise((resolve) => {
    const qp = vscode.window.createQuickPick<OverflowPick>();
    qp.placeholder = "Run a task or open settings";
    qp.items = overflowPicks();
    qp.matchOnDescription = true;
    let settled = false;
    const finish = (value: OverflowResult | undefined) => {
      if (settled) {
        return;
      }
      settled = true;
      qp.hide();
      qp.dispose();
      resolve(value);
    };
    qp.onDidAccept(() => {
      const pick = qp.selectedItems[0];
      if (!pick) {
        finish(undefined);
        return;
      }
      if (pick.openSettings) {
        finish({ type: "settings" });
        return;
      }
      if (pick.task) {
        finish({ type: "run", task: pick.task });
        return;
      }
      finish(undefined);
    });
    qp.onDidHide(() => {
      finish(undefined);
    });
    qp.show();
  });
}

export function disposeStatusBar(): void {
  for (const slot of slots) {
    disposeSlot(slot);
  }
  slots.length = 0;
  overflow?.hide();
  overflow?.dispose();
  overflow = undefined;
  compactIndicator?.hide();
  compactIndicator?.dispose();
  compactIndicator = undefined;
  overflowTasks.length = 0;
  editorListener?.dispose();
  editorListener = undefined;
}
