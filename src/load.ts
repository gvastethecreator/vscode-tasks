import os from "node:os";
import { parse, type ParseError } from "jsonc-parser";
import * as vscode from "vscode";
import { parseColor, resolveAttrs, resolveHide, statusBarOf } from "./attributes.ts";
import { parseCodiconId, TASK_CODICONS } from "./codicons.ts";
import { splitLabelEmoji, TASK_EMOJIS } from "./emoji.ts";
import { stripBom } from "./jsonc.ts";
import { log } from "./log.ts";
import { isWorkspaceTask, matchTaskResult, sameTask } from "./match.ts";
import { asTasksFile, computeTaskInfo, indexedTasks } from "./merge.ts";
import type { PanelState, PanelTaskRow } from "./panelState.ts";
import { stableJson } from "./stableJson.ts";
import {
  createTaskSourceIdentity,
  parseTaskIdentityKey,
  taskIdentityKey,
  type TaskSourceIdentity,
} from "./taskIdentity.ts";
import type {
  JsonObject,
  StatusBarSettings,
  TaskConfig,
  TasksFile,
} from "./types.ts";

type InspectedSource = {
  file: TasksFile;
  uri: vscode.Uri;
  workspaceFolderUri?: vscode.Uri;
  label: string;
};

export type ExpandedTask = {
  config: TaskConfig;
  identity: TaskSourceIdentity;
  key: string;
  sourceLabel: string;
};

export type BuiltItem = ExpandedTask & {
  task: vscode.Task;
  attrs: ReturnType<typeof resolveAttrs>;
};

export type LoadSnapshot = {
  items: BuiltItem[];
  panel: PanelState;
};

const DEFAULT_LIMIT = 3;
const MAX_LIMIT = 10;

function boundedSettingText(value: unknown, maxLength: number): string {
  return typeof value === "string" && value.length <= maxLength && !/\p{Cc}/u.test(value)
    ? value.trim()
    : "";
}

function booleanSetting(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

let lastSnapshot: LoadSnapshot = {
  items: [],
  panel: emptyPanelState(),
};

export function readSettings(): StatusBarSettings {
  const cfg = vscode.workspace.getConfiguration("tasks.statusbar");
  const requestedLimit = cfg.get<unknown>("limit");
  const limit = typeof requestedLimit === "number" && Number.isFinite(requestedLimit)
    ? Math.min(MAX_LIMIT, Math.max(0, Math.trunc(requestedLimit)))
    : DEFAULT_LIMIT;
  return {
    defaults: {
      hide: booleanSetting(cfg.get<unknown>("default.hide"), true),
      color: parseColor(cfg.get<unknown>("default.color"))?.value ?? "",
    },
    limit,
    compact: booleanSetting(cfg.get<unknown>("compact"), false),
    select: {
      label: boundedSettingText(cfg.get<unknown>("select.label"), 40) || "Tasks",
      color: parseColor(cfg.get<unknown>("select.color"))?.value ?? "",
      icon: parseCodiconId(cfg.get<string>("select.icon")) ?? "run-all",
    },
    running: {
      indicator: booleanSetting(cfg.get<unknown>("running.indicator"), true),
      highlight: booleanSetting(cfg.get<unknown>("running.highlight"), false),
    },
  };
}

function folderTasksUri(folder: vscode.WorkspaceFolder): vscode.Uri {
  return vscode.Uri.joinPath(folder.uri, ".vscode", "tasks.json");
}

function hasWorkspace(): boolean {
  return Boolean(vscode.workspace.workspaceFile || vscode.workspace.workspaceFolders?.length);
}

function savedWorkspaceFile(): vscode.Uri | undefined {
  const uri = vscode.workspace.workspaceFile;
  return uri?.path.toLowerCase().endsWith(".code-workspace") ? uri : undefined;
}

async function readText(uri: vscode.Uri): Promise<string | undefined> {
  const open = vscode.workspace.textDocuments.find(
    (document) => document.uri.toString() === uri.toString(),
  );
  if (open) {
    return open.getText();
  }
  try {
    return Buffer.from(await vscode.workspace.fs.readFile(uri)).toString("utf8");
  } catch (error) {
    if (isMissingFile(error)) {
      return;
    }
    throw error;
  }
}

function isMissingFile(error: unknown): boolean {
  return (
    error instanceof vscode.FileSystemError &&
    error.code === "FileNotFound"
  );
}

function parseJsonc(text: string, label: string, diagnostics: string[]): JsonObject | undefined {
  const errors: ParseError[] = [];
  const value = parse(stripBom(text), errors, {
    allowTrailingComma: true,
    disallowComments: false,
  });
  if (errors.length > 0 || typeof value !== "object" || value === null || Array.isArray(value)) {
    diagnostics.push("Could not parse " + label + ". Fix its JSON errors to load tasks.");
    return;
  }
  return value as JsonObject;
}

async function inspectSources(diagnostics: string[]): Promise<InspectedSource[]> {
  const sources: InspectedSource[] = [];
  const seen = new Set<string>();

  const add = async (
    uri: vscode.Uri,
    workspaceFolderUri: vscode.Uri | undefined,
    label: string,
    nested: boolean,
  ): Promise<void> => {
    const key = uri.toString();
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    const text = await readText(uri);
    if (text === undefined) {
      return;
    }
    const root = parseJsonc(text, label, diagnostics);
    const file = nested ? asTasksFile(root?.tasks) : asTasksFile(root);
    if (!file || indexedTasks(file).length === 0) {
      return;
    }
    sources.push({ file, uri, workspaceFolderUri, label });
  };

  const workspaceFile = savedWorkspaceFile();
  if (workspaceFile) {
    await add(
      workspaceFile,
      undefined,
      vscode.workspace.name || "workspace file",
      true,
    );
  }
  for (const folder of vscode.workspace.workspaceFolders ?? []) {
    await add(folderTasksUri(folder), folder.uri, folder.name, false);
  }
  return sources;
}

export async function collectExpandedTasks(
  diagnostics: string[] = [],
): Promise<ExpandedTask[]> {
  const expanded: ExpandedTask[] = [];
  for (const source of await inspectSources(diagnostics)) {
    for (const entry of indexedTasks(source.file)) {
      const config = computeTaskInfo(entry.task, source.file, os.platform());
      const identity = createTaskSourceIdentity({
        sourceUri: source.uri.toString(),
        workspaceFolderUri: source.workspaceFolderUri?.toString(),
        index: entry.index,
        config,
      });
      expanded.push({
        config,
        identity,
        key: taskIdentityKey(identity),
        sourceLabel: source.label,
      });
    }
  }
  return expanded;
}

function panelRow(task: ExpandedTask, defaults: StatusBarSettings["defaults"]): PanelTaskRow {
  const bar = statusBarOf(task.config);
  const title =
    (typeof task.config.label === "string" && task.config.label) ||
    (typeof task.config.script === "string" && task.config.script) ||
    "Task " + (task.identity.indexHint + 1);
  const rawLabel = typeof bar?.label === "string" && bar.label.length > 0
    ? bar.label
    : title;
  const split = splitLabelEmoji(rawLabel);
  return {
    key: task.key,
    title,
    source: task.sourceLabel,
    hide: resolveHide(task.config, defaults),
    emoji: split.emoji,
    label: split.text,
    color: parseColor(bar?.color)?.value ?? "",
    editable: true,
  };
}

function emptyPanelState(): PanelState {
  return {
    hasWorkspace: false,
    workspaceName: "Workspace",
    defaultHide: true,
    defaultColor: "",
    limit: DEFAULT_LIMIT,
    compact: false,
    selectLabel: "Tasks",
    selectColor: "",
    selectIcon: "run-all",
    runningIndicator: true,
    runningHighlight: false,
    visibleCount: 0,
    emojis: TASK_EMOJIS,
    codicons: TASK_CODICONS,
    diagnostics: [],
    tasks: [],
  };
}

function taskKey(task: vscode.Task): string {
  const scope =
    task.scope && typeof task.scope === "object" && "uri" in task.scope
      ? String((task.scope as vscode.WorkspaceFolder).uri)
      : String(task.scope ?? "");
  return [task.source, task.name, scope, stableJson(task.definition)].join("\0");
}

async function fetchWorkspaceTasks(): Promise<vscode.Task[]> {
  const tasks = await vscode.tasks.fetchTasks();
  const seen = new Set<string>();
  const result: vscode.Task[] = [];
  for (const task of tasks) {
    if (!isWorkspaceTask(task)) {
      continue;
    }
    const key = taskKey(task);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(task);
    }
  }
  return result;
}

export function runningTasks(): vscode.Task[] {
  return vscode.tasks.taskExecutions.map((execution) => execution.task);
}

export function isTaskRunning(task: vscode.Task, running: vscode.Task[]): boolean {
  return running.some((candidate) => sameTask(candidate, task));
}

export async function buildSnapshot(): Promise<LoadSnapshot> {
  const settings = readSettings();
  const diagnostics: string[] = [];
  if (!hasWorkspace()) {
    return {
      items: [],
      panel: {
        ...emptyPanelState(),
        workspaceName: vscode.workspace.name || "Workspace",
      },
    };
  }

  const expanded = await collectExpandedTasks(diagnostics);
  const fetched = await fetchWorkspaceTasks();
  log("Configs: " + expanded.length + ". Fetched workspace tasks: " + fetched.length + ".");
  const running = runningTasks();
  const used = new Set<vscode.Task>();
  const items: BuiltItem[] = [];
  const problems = new Map<string, string>();
  const identityCounts = new Map<string, number>();
  for (const task of expanded) {
    identityCounts.set(task.key, (identityCounts.get(task.key) ?? 0) + 1);
  }
  const addProblem = (key: string, problem: string): void => {
    const existing = problems.get(key);
    problems.set(key, existing ? existing + " " + problem : problem);
  };
  for (const task of expanded) {
    if (!parseTaskIdentityKey(task.key)) {
      addProblem(task.key, "This task identity is too large for panel edits.");
    } else if ((identityCounts.get(task.key) ?? 0) > 1) {
      addProblem(task.key, "Multiple source tasks have the same editable identity.");
    }
  }

  for (const sourceTask of expanded) {
    const available = fetched.filter((task) => !used.has(task));
    const match = matchTaskResult(available, sourceTask.config, {
      workspaceFolderUri: sourceTask.identity.workspaceFolderUri || undefined,
    });
    if (!match.task) {
      const problem = match.ambiguous
        ? "Multiple VS Code tasks match this definition."
        : "VS Code did not return a matching task.";
      addProblem(sourceTask.key, problem);
      log(problem);
      continue;
    }
    used.add(match.task);
    const attrs = resolveAttrs(
      sourceTask.config,
      match.task,
      settings.defaults,
      isTaskRunning(match.task, running),
      settings.running.highlight,
    );
    if (attrs.fileGlobError) {
      addProblem(sourceTask.key, attrs.fileGlobError);
    }
    items.push({ ...sourceTask, task: match.task, attrs });
  }

  const rows = expanded.map((task) => {
    const editable =
      Boolean(parseTaskIdentityKey(task.key)) &&
      (identityCounts.get(task.key) ?? 0) === 1;
    return {
      ...panelRow(task, settings.defaults),
      key: editable ? task.key : "",
      editable,
      problem: problems.get(task.key),
    };
  });
  const panel: PanelState = {
    hasWorkspace: true,
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
    visibleCount: rows.filter((task) => !task.hide).length,
    emojis: TASK_EMOJIS,
    codicons: TASK_CODICONS,
    diagnostics,
    tasks: rows,
  };
  return { items, panel };
}

export function rememberSnapshot(snapshot: LoadSnapshot): void {
  lastSnapshot = snapshot;
}

export function panelState(): PanelState {
  return lastSnapshot.panel;
}
