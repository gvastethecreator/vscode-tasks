const CODICON_IDS = new Set([
  "beaker",
  "broadcast",
  "check",
  "cloud",
  "code",
  "database",
  "debug-start",
  "error",
  "extensions",
  "file-code",
  "folder",
  "gear",
  "list-flat",
  "package",
  "play",
  "refresh",
  "rocket",
  "run-all",
  "server",
  "stop-circle",
  "symbol-event",
  "sync",
  "tasklist",
  "terminal",
  "tools",
  "warning",
  "watch",
]);

export const TASK_CODICONS = [...CODICON_IDS].sort();

export function parseCodiconId(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return;
  }
  const normalized = value.trim().toLowerCase();
  return CODICON_IDS.has(normalized) ? normalized : undefined;
}

export function codiconText(id: string, spin = false): string {
  return `$(${id}${spin ? "~spin" : ""})`;
}
