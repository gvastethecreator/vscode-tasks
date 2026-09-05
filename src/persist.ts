import * as vscode from "vscode";
import { parseTaskIdentityKey } from "./taskIdentity.ts";
import {
  applyStatusbarFields,
  isValidTaskSource,
  minimalReplacement,
  resolveTaskIndex,
  taskObjectOffset,
} from "./persistJson.ts";

const SETTING_KEYS = [
  "default.hide",
  "default.color",
  "limit",
  "compact",
  "select.label",
  "select.showLabel",
  "select.color",
  "select.icon",
  "running.indicator",
  "running.highlight",
] as const;

function settingsTarget(): vscode.ConfigurationTarget {
  return vscode.ConfigurationTarget.Workspace;
}

export async function updateStatusbarSetting(
  key: (typeof SETTING_KEYS)[number],
  value: unknown,
): Promise<void> {
  if (!vscode.workspace.workspaceFile && !vscode.workspace.workspaceFolders?.length) {
    throw new Error("Open a workspace before changing Status Bar Tasks settings.");
  }
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

export async function setDefaultStatusbarSettings(): Promise<void> {
  const config = vscode.workspace.getConfiguration("tasks.statusbar");
  const targets: vscode.ConfigurationTarget[] = [vscode.ConfigurationTarget.Global];
  if (vscode.workspace.workspaceFile || vscode.workspace.workspaceFolders?.length) {
    targets.push(vscode.ConfigurationTarget.Workspace);
  }
  for (const key of SETTING_KEYS) {
    const value = config.inspect(key)?.defaultValue;
    for (const target of targets) {
      await config.update(key, value, target);
    }
  }
}

function parseIdentity(key: string) {
  const identity = parseTaskIdentityKey(key);
  if (!identity) {
    throw new Error("Could not find that task.");
  }
  return identity;
}

async function sourceDocument(key: string): Promise<{
  document: vscode.TextDocument;
  index: number;
}> {
  const identity = parseIdentity(key);
  const uri = vscode.Uri.parse(identity.sourceUri, true);
  const document = await vscode.workspace.openTextDocument(uri);
  const resolution = resolveTaskIndex(document.getText(), uri.path, identity);
  if ("error" in resolution) {
    throw new Error(resolution.error);
  }
  return { document, index: resolution.index };
}

export async function updateTaskStatusbar(
  key: string,
  fields: Record<string, string | boolean | undefined>,
): Promise<void> {
  const { document, index } = await sourceDocument(key);
  const version = document.version;
  const before = document.getText();
  const after = applyStatusbarFields(before, document.uri.path, index, fields);
  if (!isValidTaskSource(after, document.uri.path)) {
    throw new Error("The task edit would produce invalid JSON. No change was applied.");
  }
  const replacement = minimalReplacement(before, after);
  if (!replacement) {
    return;
  }
  if (document.version !== version || document.getText() !== before) {
    throw new Error("The task source changed while editing. Refresh and try again.");
  }
  const edit = new vscode.WorkspaceEdit();
  edit.replace(
    document.uri,
    new vscode.Range(
      document.positionAt(replacement.start),
      document.positionAt(replacement.end),
    ),
    replacement.text,
  );
  if (!(await vscode.workspace.applyEdit(edit))) {
    throw new Error("Could not update the task source.");
  }
  if (document.getText() !== after) {
    throw new Error("The task source changed during the edit. Review the open document.");
  }
}

export async function openTaskSource(key: string): Promise<void> {
  const { document, index } = await sourceDocument(key);
  const offset = taskObjectOffset(document.getText(), document.uri.path, index);
  const position = offset == null ? new vscode.Position(0, 0) : document.positionAt(offset);
  await vscode.window.showTextDocument(document, {
    preview: false,
    selection: new vscode.Range(position, position),
  });
}
