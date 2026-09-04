import * as vscode from "vscode";

let channel: vscode.OutputChannel | undefined;

export function log(message: string): void {
  if (!channel) {
    channel = vscode.window.createOutputChannel("Status Bar Tasks");
  }
  channel.appendLine(message);
}

export function disposeLog(): void {
  channel?.dispose();
  channel = undefined;
}
