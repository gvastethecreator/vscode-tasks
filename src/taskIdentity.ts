import { createHash } from "node:crypto";
import { stableJson } from "./stableJson.ts";
import type { JsonObject, TaskConfig } from "./types.ts";

export type TaskSourceIdentity = {
  version: 1;
  sourceUri: string;
  workspaceFolderUri: string;
  indexHint: number;
  type: string;
  label: string;
  script: string;
  path: string;
  cwd: string;
  fingerprint: string;
};

type IdentityBasis = {
  type: string;
  label: string;
  script: string;
  path: string;
  cwd: string;
  dependsOn: unknown;
  isBackground: boolean;
};

export function createTaskSourceIdentity(input: {
  sourceUri: string;
  workspaceFolderUri?: string;
  index: number;
  config: TaskConfig;
}): TaskSourceIdentity {
  const basis = identityBasis(input.config);
  return {
    version: 1,
    sourceUri: input.sourceUri,
    workspaceFolderUri: input.workspaceFolderUri ?? "",
    indexHint: input.index,
    type: basis.type,
    label: basis.label,
    script: basis.script,
    path: basis.path,
    cwd: basis.cwd,
    fingerprint: fingerprint(basis),
  };
}

export function taskIdentityKey(identity: TaskSourceIdentity): string {
  return `sbt1:${Buffer.from(JSON.stringify(identity), "utf8").toString("base64url")}`;
}

export function parseTaskIdentityKey(value: unknown): TaskSourceIdentity | undefined {
  if (typeof value !== "string" || !value.startsWith("sbt1:") || value.length > 2048) {
    return;
  }
  try {
    const parsed = JSON.parse(
      Buffer.from(value.slice(5), "base64url").toString("utf8"),
    ) as unknown;
    return isTaskSourceIdentity(parsed) ? parsed : undefined;
  } catch {
    return;
  }
}

export function taskIdentityMatches(
  identity: TaskSourceIdentity,
  sourceUri: string,
  workspaceFolderUri: string | undefined,
  config: TaskConfig,
): boolean {
  const candidate = createTaskSourceIdentity({
    sourceUri,
    workspaceFolderUri,
    index: identity.indexHint,
    config,
  });
  return (
    identity.sourceUri === candidate.sourceUri &&
    identity.workspaceFolderUri === candidate.workspaceFolderUri &&
    identity.type === candidate.type &&
    identity.label === candidate.label &&
    identity.script === candidate.script &&
    identity.path === candidate.path &&
    identity.cwd === candidate.cwd &&
    identity.fingerprint === candidate.fingerprint
  );
}

function identityBasis(config: TaskConfig): IdentityBasis {
  const options = asObject(config.options);
  return {
    type: stringValue(config.type) || "process",
    label: stringValue(config.label),
    script: stringValue(config.script),
    path: normalizePath(config.path),
    cwd: normalizePath(options?.cwd),
    dependsOn: normalizeStableValue(config.dependsOn),
    isBackground: config.isBackground === true,
  };
}

function fingerprint(value: unknown): string {
  return createHash("sha256").update(stableJson(value)).digest("base64url").slice(0, 24);
}

function normalizeStableValue(value: unknown): unknown {
  if (typeof value === "string" || typeof value === "boolean" || typeof value === "number") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string").sort();
  }
  return undefined;
}

function asObject(value: unknown): JsonObject | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as JsonObject)
    : undefined;
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizePath(value: unknown): string {
  return stringValue(value).replaceAll("\\", "/").replace(/^\.\//, "").replace(/\/+$/, "");
}

function isTaskSourceIdentity(value: unknown): value is TaskSourceIdentity {
  const object = asObject(value);
  if (!object || object.version !== 1) {
    return false;
  }
  return (
    typeof object.sourceUri === "string" && object.sourceUri.length <= 1024 &&
    typeof object.workspaceFolderUri === "string" && object.workspaceFolderUri.length <= 1024 &&
    Number.isInteger(object.indexHint) && Number(object.indexHint) >= 0 &&
    typeof object.type === "string" && object.type.length <= 80 &&
    typeof object.label === "string" && object.label.length <= 160 &&
    typeof object.script === "string" && object.script.length <= 160 &&
    typeof object.path === "string" && object.path.length <= 512 &&
    typeof object.cwd === "string" && object.cwd.length <= 512 &&
    typeof object.fingerprint === "string" && /^[A-Za-z0-9_-]{24}$/.test(object.fingerprint)
  );
}
