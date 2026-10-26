import type { JsonObject, TaskConfig, TasksFile } from "./types.ts";

const GLOBAL_IGNORE = new Set(["tasks", "version", "windows", "osx", "linux"]);
const LOCAL_IGNORE = new Set(["windows", "osx", "linux"]);

export function platformKey(
  platform: NodeJS.Platform,
): "windows" | "osx" | "linux" {
  if (platform === "win32") {
    return "windows";
  }
  if (platform === "darwin") {
    return "osx";
  }
  return "linux";
}

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function deepMerge(base: unknown, overlay: unknown): unknown {
  if (typeof overlay !== "object" || overlay === null) {
    return overlay;
  }
  if (Array.isArray(overlay)) {
    return overlay.slice();
  }
  const result: JsonObject = isObject(base) ? { ...base } : {};
  for (const [key, value] of Object.entries(overlay as JsonObject)) {
    result[key] = deepMerge(result[key], value);
  }
  return result;
}

function assignExcept(
  target: JsonObject,
  source: JsonObject | undefined,
  ignore: Set<string>,
): void {
  if (!source) {
    return;
  }
  for (const [key, value] of Object.entries(source)) {
    if (!ignore.has(key)) {
      target[key] = deepMerge(target[key], value);
    }
  }
}

function assignAll(target: JsonObject, source: JsonObject | undefined): void {
  if (!source) {
    return;
  }
  for (const [key, value] of Object.entries(source)) {
    target[key] = deepMerge(target[key], value);
  }
}

export function computeTaskInfo(
  task: TaskConfig,
  config: TasksFile,
  platform: NodeJS.Platform,
): TaskConfig {
  const key = platformKey(platform);
  const result: JsonObject = {};
  assignExcept(result, config, GLOBAL_IGNORE);
  assignAll(result, isObject(config[key]) ? config[key] : undefined);
  assignExcept(result, task, LOCAL_IGNORE);
  assignAll(result, isObject(task[key]) ? task[key] : undefined);
  if (result.type === undefined) {
    result.type = "process";
  }
  return result as TaskConfig;
}

export function indexedTasks(
  file: TasksFile,
): { task: TaskConfig; index: number }[] {
  if (!Array.isArray(file.tasks)) {
    return [];
  }
  const result: { task: TaskConfig; index: number }[] = [];
  file.tasks.forEach((item, index) => {
    if (isObject(item)) {
      result.push({ task: item as TaskConfig, index });
    }
  });
  return result;
}

export function asTasksFile(value: unknown): TasksFile | undefined {
  return isObject(value) ? (value as TasksFile) : undefined;
}
