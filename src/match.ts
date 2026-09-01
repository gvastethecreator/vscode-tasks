import type { JsonObject, TaskConfig, TaskLike } from "./types.ts";

export function normalizePath(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }
  return value.replaceAll("\\", "/").replace(/^\.\//, "").replace(/\/+$/, "");
}

export function samePath(a: unknown, b: unknown): boolean {
  return normalizePath(a) === normalizePath(b);
}

function asObject(value: unknown): JsonObject | undefined {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as JsonObject;
  }
}

function cwdOf(config: TaskConfig): string {
  return normalizePath(asObject(config.options)?.cwd);
}

function definitionPath(task: TaskLike): string {
  return normalizePath(task.definition.path);
}

export function collectFetchTypes(configs: TaskConfig[]): string[] {
  const types = new Set<string>();
  for (const config of configs) {
    if (config.dependsOn !== undefined) {
      types.add("$composite");
    }
    if (typeof config.type === "string" && config.type.length > 0) {
      types.add(config.type);
    } else {
      types.add("process");
    }
  }
  return [...types];
}

function isNpmConfig(config: TaskConfig): boolean {
  return config.type === "npm";
}

function matchNpm(task: TaskLike, config: TaskConfig): boolean {
  if (task.definition.type !== "npm") {
    return false;
  }
  if (task.definition.script !== config.script) {
    return false;
  }
  const defPath = definitionPath(task);
  const configPath = normalizePath(config.path);
  const configCwd = cwdOf(config);
  if (defPath.length > 0) {
    if (configPath.length > 0) {
      return defPath === configPath;
    }
    if (configCwd.length > 0) {
      return defPath === configCwd;
    }
    return false;
  }
  return true;
}

export function namesMatch(taskName: string, label: string): boolean {
  if (taskName === label) {
    return true;
  }
  return taskName.endsWith(`: ${label}`);
}

function matchByNameAndType(task: TaskLike, config: TaskConfig): boolean {
  const type = typeof config.type === "string" ? config.type : "process";
  const labeled =
    typeof config.label === "string" && config.label.length > 0
      ? namesMatch(task.name, config.label)
      : true;
  if (!labeled) {
    return false;
  }
  const defType = task.definition.type;
  if (defType === "$empty" || defType === "$composite") {
    return true;
  }
  if (type === "shell" || type === "process") {
    if (defType === type || defType === "shell" || defType === "process") {
      return true;
    }
    return Boolean(config.label && namesMatch(task.name, config.label));
  }
  if (defType !== type) {
    return false;
  }
  return definitionSubset(task.definition, config);
}

function definitionSubset(definition: JsonObject, config: TaskConfig): boolean {
  for (const key of Object.keys(definition)) {
    if (key === "type" || key === "id") {
      continue;
    }
    if (!(key in config)) {
      continue;
    }
    if (JSON.stringify(definition[key]) !== JSON.stringify(config[key])) {
      return false;
    }
  }
  return true;
}

export function isWorkspaceTask(task: TaskLike): boolean {
  return (
    task.source === undefined ||
    task.source === "Workspace" ||
    task.source === "User"
  );
}

export function scoreMatch(task: TaskLike, config: TaskConfig): number {
  if (!isWorkspaceTask(task)) {
    return 0;
  }
  if (isNpmConfig(config) || task.definition.type === "npm") {
    if (!matchNpm(task, config)) {
      return 0;
    }
    let score = 10;
    if (typeof config.label === "string" && task.name === config.label) {
      score += 20;
    }
    if (samePath(definitionPath(task), config.path)) {
      score += 8;
    }
    if (cwdOf(config).length > 0 && samePath(definitionPath(task), cwdOf(config))) {
      score += 6;
    }
    return score;
  }
  if (!matchByNameAndType(task, config)) {
    return 0;
  }
  let score = 10;
  if (typeof config.label === "string" && task.name === config.label) {
    score += 20;
  }
  return score;
}

export function matchTask<T extends TaskLike>(
  tasks: T[],
  config: TaskConfig,
): T | undefined {
  let bestIndex = -1;
  let bestScore = 0;
  for (let i = 0; i < tasks.length; i++) {
    const score = scoreMatch(tasks[i], config);
    if (score > bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  }
  if (bestIndex < 0) {
    return;
  }
  return tasks.splice(bestIndex, 1)[0];
}

export function sameScope(a: unknown, b: unknown): boolean {
  if (a === b) {
    return true;
  }
  const aUri = scopeUri(a);
  const bUri = scopeUri(b);
  if (aUri !== undefined && bUri !== undefined) {
    return aUri === bUri;
  }
  return false;
}

function scopeUri(scope: unknown): string | undefined {
  if (typeof scope !== "object" || scope === null) {
    return;
  }
  const uri = (scope as { uri?: { fsPath?: string; toString?: () => string } })
    .uri;
  if (!uri) {
    return;
  }
  if (typeof uri.fsPath === "string") {
    return uri.fsPath;
  }
  if (typeof uri.toString === "function") {
    return uri.toString();
  }
}

export function sameTask(a: TaskLike, b: TaskLike): boolean {
  if (a.source !== b.source) {
    return false;
  }
  if (a.definition.type !== b.definition.type) {
    return false;
  }
  if (
    a.scope !== undefined &&
    b.scope !== undefined &&
    !sameScope(a.scope, b.scope)
  ) {
    return false;
  }
  if (a.definition.type === "npm") {
    return (
      a.definition.script === b.definition.script &&
      samePath(a.definition.path, b.definition.path)
    );
  }
  return a.name === b.name;
}

export function findMatchingTask<T extends TaskLike>(
  tasks: T[],
  task: TaskLike,
): T | undefined {
  return (
    tasks.find((candidate) => sameTask(candidate, task)) ??
    tasks.find(
      (candidate) =>
        candidate.name === task.name && candidate.source === task.source,
    ) ??
    tasks.find((candidate) => candidate.name === task.name)
  );
}
