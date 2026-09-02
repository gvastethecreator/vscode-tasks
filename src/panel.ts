import { randomBytes } from "node:crypto";
import * as vscode from "vscode";
import { SUPPORT_URL, type PanelState } from "./panelState.ts";

let panel: vscode.WebviewPanel | undefined;

export function openSettingsPanel(
  context: vscode.ExtensionContext,
  getState: () => PanelState,
  onMessage: (message: unknown) => void,
): void {
  if (panel) {
    panel.reveal(vscode.ViewColumn.Beside);
    postPanelState(getState());
    return;
  }

  const mediaRoot = vscode.Uri.joinPath(context.extensionUri, "media");
  panel = vscode.window.createWebviewPanel(
    "statusBarTasks.settings",
    "Status Bar Tasks",
    vscode.ViewColumn.Beside,
    {
      enableScripts: true,
      retainContextWhenHidden: false,
      localResourceRoots: [mediaRoot],
    },
  );
  panel.webview.html = renderHtml(panel.webview, mediaRoot);
  panel.onDidDispose(() => {
    panel = undefined;
  });
  panel.webview.onDidReceiveMessage(onMessage);
  context.subscriptions.push(panel);
}

export function postPanelState(state: PanelState): void {
  void panel?.webview.postMessage({ type: "state", ...state });
}

function renderHtml(webview: vscode.Webview, mediaRoot: vscode.Uri): string {
  const nonce = randomBytes(24).toString("base64url");
  const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(mediaRoot, "panel.css"));
  const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(mediaRoot, "panel.js"));
  const csp = [
    "default-src 'none'",
    "style-src " + webview.cspSource,
    "script-src 'nonce-" + nonce + "'",
  ].join("; ");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="${csp}">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Status Bar Tasks</title>
  <link rel="stylesheet" href="${styleUri}">
</head>
<body>
  <main class="page">
    <header>
      <h1>Status Bar Tasks</h1>
      <p class="muted" id="statusLine" role="status"></p>
    </header>

    <section aria-labelledby="barTitle">
      <h2 id="barTitle">Bar</h2>
      <div class="bar-card">
        <div class="toggles">
          <label class="option"><input id="defaultHide" type="checkbox"> Hide all</label>
          <label class="option"><input id="compact" type="checkbox"> Menu only</label>
          <label class="option"><input id="runningIndicator" type="checkbox"> Green indicator</label>
          <label class="option"><input id="runningHighlight" type="checkbox"> Highlight running</label>
        </div>
        <div class="fields">
          <label class="field"><span>Max</span><input id="limit" type="number" min="0" max="10"></label>
          <label class="field"><span>Menu icon</span><input id="selectIcon" type="text" maxlength="40" spellcheck="false"></label>
          <label class="field"><span>Overflow</span><input id="selectLabel" type="text" maxlength="40" spellcheck="false"></label>
          <label class="field">
            <span>Color</span>
            <span class="color-row"><input id="defaultPicker" type="color" aria-label="Default color"><input id="defaultColor" type="text" maxlength="80" spellcheck="false" placeholder="#22C1D6"></span>
          </label>
          <label class="field">
            <span>Overflow color</span>
            <span class="color-row"><input id="selectPicker" type="color" aria-label="Overflow color"><input id="selectColor" type="text" maxlength="80" spellcheck="false" placeholder="#22C1D6"></span>
          </label>
        </div>
      </div>
    </section>

    <section aria-labelledby="tasksTitle">
      <h2 id="tasksTitle">Tasks</h2>
      <div id="diagnostics" role="alert"></div>
      <div id="taskList" class="task-list"></div>
    </section>

    <section aria-labelledby="previewTitle">
      <h2 id="previewTitle">Preview</h2>
      <div class="preview-bar" id="preview" aria-hidden="true"></div>
    </section>

    <div class="footer">
      <button type="button" class="cmd secondary" id="resetSettings">Reset settings</button>
      <p class="support">
        <a href="${SUPPORT_URL}" id="supportLink">
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
          Support this project, give a star
        </a>
      </p>
    </div>
    <div class="emoji-menu" id="emojiMenu" hidden role="listbox" aria-label="Emojis"></div>
  </main>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
}
