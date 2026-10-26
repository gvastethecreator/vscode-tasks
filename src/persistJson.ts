import os from "node:os";
import {
  applyEdits,
  findNodeAtLocation,
  modify,
  parse,
  parseTree,
} from "jsonc-parser";
import { stripBom } from "./jsonc.ts";
import { asTasksFile, computeTaskInfo, indexedTasks } from "./merge.ts";
import {
  taskIdentityMatches,
  type TaskSourceIdentity,
} from "./taskIdentity.ts";
import type { JsonObject, TasksFile } from "./types.ts";

export type TaskIndexResolution =
  | { index: number }
  | { error: string };

export function taskArrayPath(
  filePath: string,
  index: number,
): (string | number)[] {
  if (isWorkspaceFile(filePath)) {
    return ["tasks", "tasks", index];
  }
  return ["tasks", index];
}

export function statusbarFieldPath(
  filePath: string,
  index: number,
  field: string,
): (string | number)[] {
  return [...taskArrayPath(filePath, index), "options", "statusbar", ...field.split(".")];
}

export function taskObjectOffset(
  text: string,
  filePath: string,
  index: number,
): number | undefined {
  const tree = parseTree(text);
  if (!tree) {
    return;
  }
  return findNodeAtLocation(tree, taskArrayPath(filePath, index))?.offset;
}

export function resolveTaskIndex(
  text: string,
  filePath: string,
  identity: TaskSourceIdentity,
): TaskIndexResolution {
  const errors: import("jsonc-parser").ParseError[] = [];
  const root = parse(stripBom(text), errors, {
    allowTrailingComma: true,
    disallowComments: false,
  }) as unknown;
  const file = tasksFile(root, filePath);
  if (errors.length > 0 || !file) {
    return { error: "Could not parse the task source." };
  }
  const matches = indexedTasks(file).filter((entry) => {
    const computed = computeTaskInfo(entry.task, file, os.platform());
    return taskIdentityMatches(
      identity,
      identity.sourceUri,
      identity.workspaceFolderUri || undefined,
      computed,
    );
  });
  if (matches.length === 0) {
    return { error: "The task changed since it was loaded. Refresh and try again." };
  }
  if (matches.length > 1) {
    return { error: "Multiple tasks have the same identity. Edit tasks.json directly." };
  }
  return { index: matches[0].index };
}

export function isValidTaskSource(text: string, filePath: string): boolean {
  const errors: import("jsonc-parser").ParseError[] = [];
  const root = parse(stripBom(text), errors, {
    allowTrailingComma: true,
    disallowComments: false,
  });
  return errors.length === 0 && tasksFile(root, filePath) !== undefined;
}

function tasksFile(value: unknown, filePath: string): TasksFile | undefined {
  if (!isRecord(value)) {
    return;
  }
  return isWorkspaceFile(filePath) ? asTasksFile(value.tasks) : asTasksFile(value);
}

function isWorkspaceFile(filePath: string): boolean {
  return filePath.replaceAll("\\", "/").endsWith(".code-workspace");
}

function isRecord(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function detectEol(text: string): string {
  return text.includes("\r\n") ? "\r\n" : "\n";
}

export function applyStatusbarFields(
  text: string,
  filePath: string,
  index: number,
  fields: Record<string, string | boolean | undefined>,
): string {
  assertEditableStatusbarContainer(text, filePath, index);
  let next = text;
  const formattingOptions = {
    tabSize: 2,
    insertSpaces: true,
    eol: detectEol(text),
  };
  for (const [field, value] of Object.entries(fields)) {
    const path = statusbarFieldPath(filePath, index, field);
    const edits = modify(next, path, value === "" ? undefined : value, {
      formattingOptions,
    });
    next = applyEdits(next, edits);
  }
  return next;
}

function assertEditableStatusbarContainer(
  text: string,
  filePath: string,
  index: number,
): void {
  const errors: import("jsonc-parser").ParseError[] = [];
  const root = parse(stripBom(text), errors, {
    allowTrailingComma: true,
    disallowComments: false,
  });
  const file = tasksFile(root, filePath);
  const task = file?.tasks?.[index];
  if (errors.length > 0 || !isRecord(task)) {
    throw new Error("Could not parse the task source.");
  }
  if (task.options !== undefined && !isRecord(task.options)) {
    throw new Error("The task options value must be an object before Status Bar settings can be edited.");
  }
  const options = isRecord(task.options) ? task.options : undefined;
  if (options?.statusbar !== undefined && !isRecord(options.statusbar)) {
    throw new Error("The task options.statusbar value must be an object before it can be edited.");
  }
}

export function minimalReplacement(
  before: string,
  after: string,
): { start: number; end: number; text: string } | undefined {
  if (before === after) {
    return;
  }
  let start = 0;
  while (start < before.length && start < after.length && before[start] === after[start]) {
    start += 1;
  }
  let beforeEnd = before.length;
  let afterEnd = after.length;
  while (
    beforeEnd > start &&
    afterEnd > start &&
    before[beforeEnd - 1] === after[afterEnd - 1]
  ) {
    beforeEnd -= 1;
    afterEnd -= 1;
  }
  return { start, end: beforeEnd, text: after.slice(start, afterEnd) };
}
