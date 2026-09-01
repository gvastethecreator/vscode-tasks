import { applyEdits, findNodeAtLocation, modify, parseTree } from "jsonc-parser";

export function taskArrayPath(
  filePath: string,
  index: number,
): (string | number)[] {
  if (filePath.replaceAll("\\", "/").endsWith(".code-workspace")) {
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

function detectEol(text: string): string {
  return text.includes("\r\n") ? "\r\n" : "\n";
}

export function applyStatusbarFields(
  text: string,
  filePath: string,
  index: number,
  fields: Record<string, string | boolean | undefined>,
): string {
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
