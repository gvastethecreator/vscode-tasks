import * as vscode from "vscode";
import { parseTaskOriginKey } from "./panelState.ts";
import { applyStatusbarFields, taskObjectOffset } from "./persistJson.ts";

const SETTING_KEYS = [
  "default.hide",
  "default.color",
  "limit",
  "compact",
  "select.label",
  "select.color",
  "select.icon",
  "running.indicator",
  "running.highlight",
] as const;

function settingsTarget(): vscode.ConfigurationTarget {
  return vscode.workspace.workspaceFolders?.length
    ? vscode.ConfigurationTarget.Workspace
    : vscode.ConfigurationTarget.Global;
}

export async function updateStatusbarSetting(
  key: (typeof SETTING_KEYS)[number],
  value: unknown,
): Promise<void> {
  await vscode.workspace
    .getConfiguration("tasks.statusbar")
    .update(key, value, settingsTarget());
}

export async function resetStatusbarSettings(): Promise<void> {
  const target = settingsTarget();
  const config = vscode.workspace.getConfiguration("tasks.statusbar");
  for (const key of SETTING_KEYS) {
    await config.update(key, undefined, target);
  }
}

async function readText(uri: vscode.Uri): Promise<string> {
  const open = vscode.workspace.textDocuments.find(
    (doc) => doc.uri.toString() === uri.toString(),
  );
  if (open) {
    return open.getText();
  }
  return Buffer.from(await vscode.workspace.fs.readFile(uri)).toString("utf8");
}

async function writeText(uri: vscode.Uri, text: string): Promise<void> {
  const open = vscode.workspace.textDocuments.find(
    (doc) => doc.uri.toString() === uri.toString(),
  );
  if (open) {
    const edit = new vscode.WorkspaceEdit();
    const range = new vscode.Range(
      open.positionAt(0),
      open.positionAt(open.getText().length),
    );
    edit.replace(uri, range, text);
    const applied = await vscode.workspace.applyEdit(edit);
    if (!applied) {
      throw new Error("Could not update tasks.json.");
    }
    return;
  }
  await vscode.workspace.fs.writeFile(uri, Buffer.from(text, "utf8"));
}

export async function updateTaskStatusbar(
  key: string,
  fields: Record<string, string | boolean | undefined>,
): Promise<void> {
  const parsed = parseTaskOriginKey(key);
  if (!parsed) {
    throw new Error("Could not find that task.");
  }
  if (parsed.uri === "user" || !parsed.uri.includes(":")) {
    throw new Error("User tasks cannot be edited here.");
  }
  const uri = vscode.Uri.parse(parsed.uri);
  const text = await readText(uri);
  const next = applyStatusbarFields(text, uri.fsPath, parsed.index, fields);
  if (next === text) {
    return;
  }
  await writeText(uri, next);
}

export async function openTaskSource(key: string): Promise<void> {
  const parsed = parseTaskOriginKey(key);
  if (!parsed) {
    throw new Error("Could not find that task.");
  }
  if (parsed.uri === "user" || !parsed.uri.includes(":")) {
    throw new Error("User tasks cannot be edited here.");
  }
  const uri = vscode.Uri.parse(parsed.uri);
  const doc = await vscode.workspace.openTextDocument(uri);
  const offset = taskObjectOffset(doc.getText(), uri.fsPath, parsed.index);
  const pos =
    offset == null ? new vscode.Position(0, 0) : doc.positionAt(offset);
  await vscode.window.showTextDocument(doc, {
    preview: false,
    selection: new vscode.Range(pos, pos),
  });
}
