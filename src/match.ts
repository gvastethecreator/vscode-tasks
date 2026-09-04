import type { JsonObject, TaskConfig, TaskLike } from "./types.ts";
import { stableJson } from "./stableJson.ts";

export type MatchContext = {
  workspaceFolderUri?: string;
};

export type TaskMatch<T extends TaskLike> = {
  task?: T;
  score: number;
  ambiguous: boolean;
  candidates: readonly T[];
};

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

export function namesMatch(taskName: string, label: string): boolean {
  return taskName === label || taskName.endsWith(`: ${label}`);
}

function compatibleType(task: TaskLike, config: TaskConfig): boolean {
  const actual = task.definition.type;
  const expected = typeof config.type === "string" ? config.type : "process";
  if (actual === "$empty" || actual === "$composite") {
    return true;
  }
  if (expected === "shell" || expected === "process") {
    return actual === "shell" || actual === "process";
  }
  return actual === expected;
}

function definitionSubset(definition: JsonObject, config: TaskConfig): boolean {
  for (const [key, value] of Object.entries(definition)) {
    if (key === "type" || key === "id" || !(key in config)) {
      continue;
    }
    if (stableJson(value) !== stableJson(config[key])) {
      return false;
    }
  }
  return true;
}

export function scopeUri(scope: unknown): string | undefined {
  if (typeof scope !== "object" || scope === null) {
    return;
  }
  const uri = (scope as { uri?: { fsPath?: string; toString?: () => string } }).uri;
  if (!uri) {
    return;
  }
  if (typeof uri.toString === "function") {
    const value = uri.toString();
    if (value && value !== "[object Object]") {
      return value;
    }
  }
  if (typeof uri.fsPath === "string") {
    return normalizePath(uri.fsPath);
  }
}

export function isWorkspaceTask(task: TaskLike): boolean {
  if (task.source === "User" || task.scope === 1) {
    return false;
  }
  return task.source === "Workspace" || task.scope === 2 || scopeUri(task.scope) !== undefined;
}

export function scoreMatch(
  task: TaskLike,
  config: TaskConfig,
  context: MatchContext = {},
): number {
  if (!isWorkspaceTask(task) || !compatibleType(task, config)) {
    return 0;
  }

  const expectedScope = context.workspaceFolderUri;
  const actualScope = scopeUri(task.scope);
  if (expectedScope && (!actualScope || !samePath(actualScope, expectedScope))) {
    return 0;
  }

  const label = typeof config.label === "string" ? config.label : "";
  const exactName = label.length > 0 && task.name === label;
  const prefixedName = label.length > 0 && namesMatch(task.name, label);
  if (label && !prefixedName) {
    return 0;
  }

  let score = 10;
  if (expectedScope && actualScope) {
    score += 40;
  }
  if (exactName) {
    score += 40;
  } else if (prefixedName) {
    score += 20;
  }

  if (config.type === "npm" || task.definition.type === "npm") {
    if (task.definition.type !== "npm" || task.definition.script !== config.script) {
      return 0;
    }
    score += 30;
    const actualPath = definitionPath(task);
    const configPath = normalizePath(config.path);
    const configCwd = cwdOf(config);
    if (actualPath && configPath) {
      if (!samePath(actualPath, configPath)) {
        return 0;
      }
      score += 20;
    } else if (actualPath && configCwd) {
      if (!samePath(actualPath, configCwd)) {
        return 0;
      }
      score += 15;
    }
    return score;
  }

  return definitionSubset(task.definition, config) ? score : 0;
}

export function matchTaskResult<T extends TaskLike>(
  tasks: readonly T[],
  config: TaskConfig,
  context: MatchContext = {},
): TaskMatch<T> {
  let bestScore = 0;
  let candidates: T[] = [];
  for (const task of tasks) {
    const score = scoreMatch(task, config, context);
    if (score > bestScore) {
      bestScore = score;
      candidates = [task];
    } else if (score > 0 && score === bestScore) {
      candidates.push(task);
    }
  }
  return {
    task: candidates.length === 1 ? candidates[0] : undefined,
    score: bestScore,
    ambiguous: candidates.length > 1,
    candidates,
  };
}

export function sameScope(a: unknown, b: unknown): boolean {
  if (a === b) {
    return true;
  }
  const aUri = scopeUri(a);
  const bUri = scopeUri(b);
  return aUri !== undefined && bUri !== undefined && samePath(aUri, bUri);
}

export function sameTask(a: TaskLike, b: TaskLike): boolean {
  if (a.source !== b.source || a.definition.type !== b.definition.type) {
    return false;
  }
  if ((a.scope === undefined) !== (b.scope === undefined) || !sameScope(a.scope, b.scope)) {
    return false;
  }
  if (a.definition.type === "npm") {
    return (
      a.definition.script === b.definition.script &&
      samePath(a.definition.path, b.definition.path)
    );
  }
  return a.name === b.name && stableJson(a.definition) === stableJson(b.definition);
}
