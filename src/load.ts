import os from "node:os";
import * as vscode from "vscode";
import { resolveAttrs, resolveHide, statusBarOf } from "./attributes.ts";
import { log } from "./log.ts";
import { matchTask, sameTask } from "./match.ts";
import { asTasksFile, computeTaskInfo, indexedTasks } from "./merge.ts";
import { TASK_EMOJIS, splitLabelEmoji } from "./emoji.ts";
import { taskOriginKey, type PanelState, type PanelTaskRow } from "./panelState.ts";
import type {
  StatusBarDefaults,
  StatusBarSettings,
  TaskConfig,
  TasksFile,
} from "./types.ts";

type InspectedSource = {
  file: TasksFile;
  uri?: vscode.Uri;
};

type ExpandedTask = {
  config: TaskConfig;
  origin: { uri?: vscode.Uri; index: number };
};

export type BuiltItem = {
  task: vscode.Task;
  config: TaskConfig;
  attrs: ReturnType<typeof resolveAttrs>;
};

export function readSettings(): StatusBarSettings {
  const cfg = vscode.workspace.getConfiguration("tasks.statusbar");
  return {
    defaults: {
      hide: cfg.get<boolean>("default.hide") ?? false,
      color: cfg.get<string>("default.color") ?? "",
    },
    limit: cfg.get<number | null>("limit") ?? null,
    compact: cfg.get<boolean>("compact") ?? false,
    select: {
      label: cfg.get<string>("select.label") || "...",
      color: cfg.get<string>("select.color") ?? "",
      icon: cfg.get<string>("select.icon") ?? "",
    },
    running: {
      indicator: cfg.get<boolean>("running.indicator") ?? true,
      highlight: cfg.get<boolean>("running.highlight") ?? true,
    },
  };
}

function folderTasksUri(folder: vscode.WorkspaceFolder): vscode.Uri {
  return vscode.Uri.joinPath(folder.uri, ".vscode", "tasks.json");
}

function inspectSources(): InspectedSource[] {
  const files: InspectedSource[] = [];
  const seen = new Set<string>();
  const add = (value: unknown, uri?: vscode.Uri): void => {
    const file = asTasksFile(value);
    if (!file || indexedTasks(file).length === 0) {
      return;
    }
    const key = uri?.toString() ?? `user:${JSON.stringify(file)}`;
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    files.push({ file, uri });
  };

  const root = vscode.workspace.getConfiguration().inspect("tasks");
  add(root?.globalValue);
  if (vscode.workspace.workspaceFile) {
    add(root?.workspaceValue, vscode.workspace.workspaceFile);
  } else if (vscode.workspace.workspaceFolders?.[0]) {
    add(root?.workspaceValue, folderTasksUri(vscode.workspace.workspaceFolders[0]));
  }
  if (vscode.workspace.workspaceFolders?.[0]) {
    add(
      root?.workspaceFolderValue,
      folderTasksUri(vscode.workspace.workspaceFolders[0]),
    );
  }

  for (const folder of vscode.workspace.workspaceFolders ?? []) {
    const scoped = vscode.workspace
      .getConfiguration(undefined, folder.uri)
      .inspect("tasks");
    add(scoped?.workspaceFolderValue, folderTasksUri(folder));
  }
  return files;
}

export function collectExpandedTasks(): ExpandedTask[] {
  const expanded: ExpandedTask[] = [];
  for (const source of inspectSources()) {
    for (const entry of indexedTasks(source.file)) {
      expanded.push({
        config: computeTaskInfo(entry.task, source.file, os.platform()),
        origin: { uri: source.uri, index: entry.index },
      });
    }
  }
  return expanded;
}

export function listPanelTasks(): PanelTaskRow[] {
  const defaults = readSettings().defaults;
  return collectExpandedTasks().map((item) => {
    const bar = statusBarOf(item.config);
    const title =
      (typeof item.config.label === "string" && item.config.label) ||
      (typeof item.config.script === "string" && item.config.script) ||
      `Task ${item.origin.index + 1}`;
    const rawLabel =
      typeof bar?.label === "string" && bar.label.length > 0 ? bar.label : title;
    const split = splitLabelEmoji(rawLabel);
    const uri = item.origin.uri?.toString() ?? "";
    return {
      key: uri ? taskOriginKey(uri, item.origin.index) : `user::${item.origin.index}`,
      title,
      hide: resolveHide(item.config, defaults),
      emoji: split.emoji,
      label: split.text,
      color: typeof bar?.color === "string" ? bar.color : "",
      editable: Boolean(item.origin.uri),
    };
  });
}

export function panelState(): PanelState {
  const settings = readSettings();
  const tasks = listPanelTasks();
  return {
    hasWorkspace: Boolean(vscode.workspace.workspaceFolders?.length),
    workspaceName: vscode.workspace.name || "Workspace",
    defaultHide: settings.defaults.hide,
    defaultColor: settings.defaults.color,
    limit: settings.limit,
    compact: settings.compact,
    selectLabel: settings.select.label,
    selectColor: settings.select.color,
    selectIcon: settings.select.icon,
    runningIndicator: settings.running.indicator,
    runningHighlight: settings.running.highlight,
    visibleCount: tasks.filter((task) => !task.hide).length,
    emojis: TASK_EMOJIS,
    tasks,
  };
}

function taskKey(task: vscode.Task): string {
  const scope =
    task.scope && typeof task.scope === "object" && "uri" in task.scope
      ? String((task.scope as vscode.WorkspaceFolder).uri)
      : String(task.scope ?? "");
  return `${task.source}\0${task.name}\0${scope}\0${JSON.stringify(task.definition)}`;
}

async function fetchWorkspaceTasks(): Promise<vscode.Task[]> {
  let tasks: vscode.Task[] = [];
  try {
    tasks = await vscode.tasks.fetchTasks();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log(`fetchTasks failed: ${message}`);
    return [];
  }
  const seen = new Set<string>();
  const result: vscode.Task[] = [];
  for (const task of tasks) {
    if (task.source !== "Workspace" && task.source !== "User") {
      continue;
    }
    const key = taskKey(task);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(task);
  }
  return result;
}

export function runningTasks(): vscode.Task[] {
  return vscode.tasks.taskExecutions.map((execution) => execution.task);
}

export function isTaskRunning(
  task: vscode.Task,
  running: vscode.Task[],
): boolean {
  return running.some((candidate) => sameTask(candidate, task));
}

export async function buildItems(): Promise<BuiltItem[]> {
  if (vscode.workspace.workspaceFolders === undefined) {
    return [];
  }

  const expanded = collectExpandedTasks();

  const remaining = await fetchWorkspaceTasks();
  log(
    `Configs: ${expanded.length}. Fetched: ${remaining.length}` +
      (remaining.length > 0
        ? ` (${remaining.map((task) => `${task.name} [${task.definition.type}/${task.source}]`).join("; ")})`
        : ""),
  );
  const settings = readSettings();
  const running = runningTasks();
  const items: BuiltItem[] = [];

  for (const { config } of expanded) {
    if (resolveHide(config, settings.defaults)) {
      continue;
    }
    const task = matchTask(remaining, config);
    if (!task) {
      const label =
        (typeof config.label === "string" && config.label) ||
        (typeof config.script === "string" && `npm: ${config.script}`) ||
        `{ type:${config.type} }`;
      log(`Not found task: ${label}`);
      continue;
    }
    items.push({
      task,
      config,
      attrs: resolveAttrs(
        config,
        task,
        settings.defaults,
        isTaskRunning(task, running),
        settings.running.highlight,
      ),
    });
  }

  for (const task of remaining) {
    log(`No match task: ${task.name}`);
  }

  return items;
}
