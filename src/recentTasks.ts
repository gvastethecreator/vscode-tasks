import { createHash } from "node:crypto";
import type * as vscode from "vscode";
import { scopeUri } from "./match.ts";
import { stableJson } from "./stableJson.ts";

const KEY = "statusBarTasks.recentReferences";

export function recentTaskKey(task: vscode.Task): string {
  // Store only an opaque reference; never persist commands, arguments or env.
  const definition = Object.fromEntries(Object.entries(task.definition).filter(([key]) => !key.startsWith("_")));
  return createHash("sha256").update(stableJson({ name: task.name, source: task.source, scope: scopeUri(task.scope) ?? task.scope, definition })).digest("hex");
}

export class RecentTasks {
  #pending: Promise<void> = Promise.resolve();
  constructor(private readonly state: vscode.Memento) {}

  get keys(): readonly string[] {
    const stored = this.state.get<unknown>(KEY);
    return Array.isArray(stored) ? [...new Set(stored.filter((key): key is string => typeof key === "string" && /^[a-f0-9]{64}$/.test(key)))].slice(0, 10) : [];
  }

  remember(task: vscode.Task): Promise<void> {
    const key = recentTaskKey(task);
    return this.enqueue(() => this.state.update(KEY, [key, ...this.keys.filter((existing) => existing !== key)].slice(0, 10)));
  }

  clear(): Promise<void> {
    return this.enqueue(() => this.state.update(KEY, undefined));
  }

  private enqueue(write: () => Thenable<void>): Promise<void> {
    const operation = this.#pending.then(write);
    this.#pending = operation.catch(() => {});
    return operation;
  }
}
