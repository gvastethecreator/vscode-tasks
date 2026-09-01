import * as vscode from "vscode";
import type { PanelMessage, PanelState } from "./panelState.ts";
import { escapeHtml, nonce, SUPPORT_URL } from "./panelState.ts";

let panel: vscode.WebviewPanel | undefined;

export function openSettingsPanel(
  context: vscode.ExtensionContext,
  getState: () => PanelState,
  onMessage: (message: PanelMessage) => Promise<void>,
): void {
  if (panel) {
    panel.reveal(vscode.ViewColumn.Beside);
    postPanelState(getState());
    return;
  }

  panel = vscode.window.createWebviewPanel(
    "statusBarTasks.settings",
    "Status Bar Tasks",
    vscode.ViewColumn.Beside,
    {
      enableScripts: true,
      retainContextWhenHidden: true,
    },
  );

  const scriptNonce = nonce();
  panel.webview.html = renderHtml(scriptNonce, getState());
  panel.onDidDispose(() => {
    panel = undefined;
  });
  panel.webview.onDidReceiveMessage((message: PanelMessage) => {
    void onMessage(message);
  });
  context.subscriptions.push(panel);
}

export function postPanelState(state: PanelState): void {
  panel?.webview.postMessage({ type: "state", ...state });
}

function renderHtml(scriptNonce: string, state: PanelState): string {
  const csp = [
    `default-src 'none'`,
    `style-src 'unsafe-inline'`,
    `script-src 'nonce-${scriptNonce}'`,
  ].join("; ");

  const taskCards = state.tasks
    .map((task) => {
      const disabled = task.editable ? "" : "disabled";
      const picker = task.color.startsWith("#") ? task.color : "#888888";
      return `<article class="task" data-key="${escapeHtml(task.key)}">
        <label class="option show">
          <input type="checkbox" data-field="show" ${task.hide ? "" : "checked"} ${disabled} aria-label="Show ${escapeHtml(task.title)}" />
        </label>
        <button type="button" class="emoji-pick" data-field="emoji" aria-label="Emoji" aria-haspopup="listbox" ${disabled}>${task.emoji ? escapeHtml(task.emoji) : "·"}</button>
        <input type="text" data-field="label" spellcheck="false" value="${escapeHtml(task.label)}" placeholder="${escapeHtml(task.title)}" ${disabled} />
        <input type="color" data-field="picker" value="${escapeHtml(picker)}" aria-label="Color" ${disabled} />
        <input type="text" data-field="color" spellcheck="false" value="${escapeHtml(task.color)}" placeholder="#22C1D6" ${disabled} />
        <button type="button" class="icon-btn" data-field="edit" aria-label="Edit in tasks.json" ${disabled}>
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M13.23 1c.48 0 .94.2 1.28.55l.14.15c.33.36.48.83.43 1.3a1.74 1.74 0 0 1-.55 1.01L5.81 13.2a1.75 1.75 0 0 1-.73.43l-3.38.91a.75.75 0 0 1-.92-.93l.91-3.38c.08-.27.23-.52.44-.72L11.02 1.7A1.75 1.75 0 0 1 13.23 1zm-1.6 1.82L3.05 10.4l-.54 2.03 2.03-.55 8.57-8.57-1.48-1.49z"/></svg>
        </button>
      </article>`;
    })
    .join("");

  const defaultPicker = state.defaultColor.startsWith("#")
    ? state.defaultColor
    : "#888888";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="${csp}" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Status Bar Tasks</title>
  <style>
    :root { color-scheme: light dark; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
      background: var(--vscode-editor-background);
    }
    .page {
      max-width: 52rem;
      margin: 0 auto;
      padding: 12px 16px 16px;
      display: grid;
      gap: 12px;
    }
    header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 8px;
      min-width: 0;
    }
    section { display: grid; gap: 6px; min-width: 0; }
    h1 { font-size: 1rem; font-weight: 600; margin: 0; }
    h2 {
      font-size: 0.75rem;
      font-weight: 600;
      margin: 0;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--vscode-descriptionForeground);
    }
    .muted { color: var(--vscode-descriptionForeground); margin: 0; font-size: 0.8rem; }
    .field { display: grid; gap: 3px; min-width: 0; }
    .field > span { color: var(--vscode-descriptionForeground); font-size: 0.72rem; }
    input[type="text"], input[type="number"] {
      width: 100%;
      min-width: 0;
      padding: 4px 6px;
      color: var(--vscode-input-foreground);
      background: var(--vscode-input-background);
      border: 1px solid var(--vscode-input-border, var(--vscode-widget-border));
      border-radius: 3px;
    }
    input:disabled { opacity: 0.55; cursor: not-allowed; }
    .option {
      display: flex;
      align-items: center;
      gap: 6px;
      min-height: 22px;
      cursor: pointer;
      font-size: 0.85rem;
    }
    .bar-card {
      display: grid;
      gap: 8px;
      padding: 8px;
      border: 1px solid var(--vscode-widget-border, var(--vscode-editorWidget-border));
      border-radius: 5px;
    }
    .toggles {
      display: flex;
      flex-wrap: wrap;
      gap: 4px 14px;
    }
    .fields {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(8.5rem, 1fr));
      gap: 6px 8px;
    }
    .color-row { display: flex; gap: 6px; align-items: center; min-width: 0; }
    .color-row input[type="text"] { flex: 1; }
    .emoji-pick {
      width: 26px;
      height: 26px;
      flex: none;
      padding: 0;
      border: 1px solid var(--vscode-input-border, var(--vscode-widget-border));
      border-radius: 3px;
      color: var(--vscode-foreground);
      background: var(--vscode-input-background);
      cursor: pointer;
      font-size: 14px;
      line-height: 1;
    }
    .emoji-menu {
      position: fixed;
      z-index: 20;
      display: grid;
      grid-template-columns: repeat(8, 1.75rem);
      gap: 2px;
      padding: 6px;
      background: var(--vscode-menu-background, var(--vscode-editorWidget-background));
      border: 1px solid var(--vscode-widget-border, var(--vscode-editorWidget-border));
      border-radius: 6px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.28);
    }
    .emoji-menu[hidden] { display: none; }
    .emoji-option {
      width: 1.75rem;
      height: 1.75rem;
      display: grid;
      place-items: center;
      padding: 0;
      border: none;
      border-radius: 4px;
      background: transparent;
      cursor: pointer;
      font-size: 14px;
    }
    .emoji-option:hover,
    .emoji-option[aria-current="true"] {
      background: var(--vscode-list-hoverBackground, rgba(255, 255, 255, 0.08));
    }
    input[type="color"] {
      width: 26px;
      height: 26px;
      padding: 0;
      border: 1px solid var(--vscode-widget-border, transparent);
      border-radius: 3px;
      background: transparent;
      cursor: pointer;
      flex: none;
    }
    .preview-bar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 4px;
      min-height: 24px;
      padding: 4px 6px;
      border-radius: 3px;
      background: var(--vscode-statusBar-background, #007acc);
    }
    .pill {
      padding: 2px 8px;
      border-radius: 3px;
      font-size: 11px;
      line-height: 18px;
      color: var(--vscode-statusBar-foreground, #fff);
      background: color-mix(in srgb, currentColor 12%, transparent);
    }
    .dot {
      width: 0.5rem;
      height: 0.5rem;
      border-radius: 50%;
      background: #3fb950;
      box-shadow: 0 0 0 2px color-mix(in srgb, #3fb950 28%, transparent);
      flex: none;
    }
    .running-pill {
      display: inline-flex;
      align-items: stretch;
      overflow: hidden;
      border-radius: 4px;
      background: var(--vscode-statusBarItem-warningBackground, #cca700);
    }
    .running-pill .seg {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      margin: 0;
      border: 0;
      border-radius: 0;
      padding: 2px 8px;
      color: var(--vscode-statusBar-foreground, #fff);
      background: transparent;
      font: inherit;
      font-size: 11px;
      line-height: 18px;
    }
    .task-list { display: grid; gap: 4px; }
    .task {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      align-items: center;
      padding: 5px 6px;
      border: 1px solid var(--vscode-widget-border, var(--vscode-editorWidget-border));
      border-radius: 4px;
    }
    .task .show { min-height: 0; }
    .task [data-field="label"] { flex: 1.4 1 8rem; min-width: 7rem; }
    .task [data-field="color"] { width: 5.5rem; flex: none; }
    .icon-btn {
      width: 26px;
      height: 26px;
      flex: none;
      display: grid;
      place-items: center;
      padding: 0;
      border: 1px solid var(--vscode-input-border, var(--vscode-widget-border));
      border-radius: 3px;
      color: var(--vscode-foreground);
      background: var(--vscode-input-background);
      cursor: pointer;
    }
    .icon-btn:disabled { opacity: 0.45; cursor: not-allowed; }
    .footer {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 8px 12px;
      padding-top: 8px;
      border-top: 1px solid var(--vscode-widget-border, transparent);
    }
    .support a {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      color: var(--vscode-descriptionForeground);
      text-decoration: none;
      font-size: 0.8rem;
    }
    .support a:hover { color: var(--vscode-foreground); }
    button.cmd {
      padding: 6px 12px;
      min-height: 32px;
      border: none;
      border-radius: 4px;
      color: var(--vscode-button-foreground);
      background: var(--vscode-button-background);
      cursor: pointer;
    }
    button.cmd.secondary {
      color: var(--vscode-button-secondaryForeground);
      background: var(--vscode-button-secondaryBackground);
    }
    button.cmd:disabled { opacity: 0.45; cursor: not-allowed; }
    :focus-visible {
      outline: 2px solid var(--vscode-focusBorder);
      outline-offset: 2px;
    }
  </style>
</head>
<body>
  <main class="page">
    <header>
      <h1>Status Bar Tasks</h1>
      <p class="muted" id="statusLine" role="status">${escapeHtml(state.workspaceName)}</p>
    </header>
    <section>
      <h2>Bar</h2>
      <div class="bar-card">
        <div class="preview-bar" id="preview" aria-hidden="true"></div>
        <div class="toggles">
          <label class="option">
            <input id="defaultHide" type="checkbox" ${state.defaultHide ? "checked" : ""} />
            <span>Hide all</span>
          </label>
          <label class="option">
            <input id="compact" type="checkbox" ${state.compact ? "checked" : ""} />
            <span>Menu only</span>
          </label>
          <label class="option">
            <input id="runningIndicator" type="checkbox" ${state.runningIndicator ? "checked" : ""} />
            <span>Green indicator</span>
          </label>
          <label class="option">
            <input id="runningHighlight" type="checkbox" ${state.runningHighlight ? "checked" : ""} />
            <span>Highlight running</span>
          </label>
        </div>
        <div class="fields">
          <label class="field">
            <span>Max</span>
            <input id="limit" type="number" min="0" placeholder="All" value="${state.limit == null ? "" : String(state.limit)}" ${state.compact ? "disabled" : ""} />
          </label>
          <label class="field">
            <span>Menu icon</span>
            <input id="selectIcon" type="text" spellcheck="false" value="${escapeHtml(state.selectIcon)}" placeholder="run-all" />
          </label>
          <label class="field">
            <span>Overflow</span>
            <input id="selectLabel" type="text" spellcheck="false" value="${escapeHtml(state.selectLabel)}" />
          </label>
          <label class="field">
            <span>Color</span>
            <div class="color-row">
              <input id="defaultPicker" type="color" value="${escapeHtml(defaultPicker)}" aria-label="Default color" />
              <input id="defaultColor" type="text" spellcheck="false" value="${escapeHtml(state.defaultColor)}" placeholder="#22C1D6" />
            </div>
          </label>
          <label class="field">
            <span>Overflow color</span>
            <div class="color-row">
              <input id="selectPicker" type="color" value="${escapeHtml(state.selectColor.startsWith("#") ? state.selectColor : "#888888")}" aria-label="Overflow color" />
              <input id="selectColor" type="text" spellcheck="false" value="${escapeHtml(state.selectColor)}" placeholder="#22C1D6" />
            </div>
          </label>
        </div>
      </div>
    </section>
    <section>
      <h2>Tasks</h2>
      <div id="taskList" class="task-list">${taskCards || `<p class="muted">No workspace tasks found.</p>`}</div>
    </section>
    <div class="footer">
      <button type="button" class="cmd secondary" id="resetSettings" ${state.hasWorkspace ? "" : "disabled"}>Reset settings</button>
      <p class="support">
        <a href="${SUPPORT_URL}" id="supportLink">
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
          Support this project, give a star
        </a>
      </p>
    </div>
    <div class="emoji-menu" id="emojiMenu" hidden role="listbox" aria-label="Emojis">
      <button type="button" class="emoji-option" data-emoji="" title="None" aria-label="None">·</button>
      ${state.emojis.map((item) => `<button type="button" class="emoji-option" data-emoji="${escapeHtml(item)}" title="${escapeHtml(item)}" aria-label="${escapeHtml(item)}">${item}</button>`).join("")}
    </div>
  </main>
  <script nonce="${scriptNonce}">
    const vscode = acquireVsCodeApi();
    const statusLine = document.getElementById("statusLine");
    const preview = document.getElementById("preview");
    const defaultHide = document.getElementById("defaultHide");
    const compact = document.getElementById("compact");
    const defaultColor = document.getElementById("defaultColor");
    const defaultPicker = document.getElementById("defaultPicker");
    const limit = document.getElementById("limit");
    const selectIcon = document.getElementById("selectIcon");
    const selectLabel = document.getElementById("selectLabel");
    const selectColor = document.getElementById("selectColor");
    const selectPicker = document.getElementById("selectPicker");
    const runningIndicator = document.getElementById("runningIndicator");
    const runningHighlight = document.getElementById("runningHighlight");
    const resetSettings = document.getElementById("resetSettings");
    const taskList = document.getElementById("taskList");
    const emojiMenu = document.getElementById("emojiMenu");
    let emojiKey = "";
    let colorTimer;
    let textTimer;

    function validHex(value) {
      return value.trim() === "" || /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value.trim());
    }

    function normalizeHex(value) {
      const v = value.trim();
      if (v.length === 0) return "";
      if (/^#?[0-9a-fA-F]{3}$/.test(v)) {
        const s = v.replace("#", "");
        return "#" + s.split("").map((c) => c + c).join("").toLowerCase();
      }
      return "#" + v.replace("#", "").toLowerCase();
    }

    function renderPreview(state) {
      const visible = state.compact ? [] : state.tasks.filter((task) => !task.hide);
      preview.replaceChildren();
      if (state.compact) {
        const menu = document.createElement("span");
        menu.className = "pill";
        menu.textContent = state.selectIcon ? "$(" + state.selectIcon + ")" : "$(run-all)";
        preview.append(menu);
        return;
      }
      if (visible.length === 0) {
        const empty = document.createElement("span");
        empty.className = "pill";
        empty.textContent = "No tasks shown";
        preview.append(empty);
        return;
      }
      for (const task of visible) {
        const pill = document.createElement("span");
        pill.className = "pill";
        const shown = ((task.emoji ? task.emoji + " " : "") + (task.label || "")).trim();
        pill.textContent = shown || task.title;
        if (task.color) pill.style.color = task.color;
        preview.append(pill);
      }
      const sample = document.createElement("span");
      sample.className = state.runningHighlight ? "running-pill" : "pill";
      const seg = document.createElement("span");
      seg.className = "seg";
      if (state.runningIndicator) {
        const dot = document.createElement("span");
        dot.className = "dot";
        dot.title = "Running";
        seg.append(dot);
      }
      seg.append("echo");
      sample.append(seg);
      preview.append(sample);
    }

    function escapeText(value) {
      return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;");
    }

    function renderTasks(state) {
      if (!state.tasks.length) {
        taskList.innerHTML = '<p class="muted">No workspace tasks found.</p>';
        return;
      }
      taskList.innerHTML = state.tasks.map((task) => {
        const disabled = task.editable ? "" : "disabled";
        const picker = task.color.startsWith("#") ? task.color : "#888888";
        return '<article class="task" data-key="' + escapeText(task.key) + '">' +
          '<label class="option show"><input type="checkbox" data-field="show" ' + (task.hide ? "" : "checked") + " " + disabled + ' aria-label="Show ' + escapeText(task.title) + '" /></label>' +
          '<button type="button" class="emoji-pick" data-field="emoji" aria-label="Emoji" aria-haspopup="listbox" ' + disabled + ">" + (task.emoji ? escapeText(task.emoji) : "·") + "</button>" +
          '<input type="text" data-field="label" spellcheck="false" value="' + escapeText(task.label) + '" placeholder="' + escapeText(task.title) + '" ' + disabled + " />" +
          '<input type="color" data-field="picker" value="' + escapeText(picker) + '" aria-label="Color" ' + disabled + " />" +
          '<input type="text" data-field="color" spellcheck="false" value="' + escapeText(task.color) + '" placeholder="#22C1D6" ' + disabled + " />" +
          '<button type="button" class="icon-btn" data-field="edit" aria-label="Edit in tasks.json" ' + disabled + '><svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M13.23 1c.48 0 .94.2 1.28.55l.14.15c.33.36.48.83.43 1.3a1.74 1.74 0 0 1-.55 1.01L5.81 13.2a1.75 1.75 0 0 1-.73.43l-3.38.91a.75.75 0 0 1-.92-.93l.91-3.38c.08-.27.23-.52.44-.72L11.02 1.7A1.75 1.75 0 0 1 13.23 1zm-1.6 1.82L3.05 10.4l-.54 2.03 2.03-.55 8.57-8.57-1.48-1.49z"/></svg></button>' +
          "</article>";
      }).join("");
      bindTasks();
    }

    function bindTasks() {
      for (const card of taskList.querySelectorAll(".task")) {
        const key = card.dataset.key;
        const show = card.querySelector("[data-field='show']");
        const label = card.querySelector("[data-field='label']");
        const emojiPick = card.querySelector("[data-field='emoji']");
        const color = card.querySelector("[data-field='color']");
        const picker = card.querySelector("[data-field='picker']");
        const edit = card.querySelector("[data-field='edit']");
        show.addEventListener("change", () => {
          vscode.postMessage({ type: "setTaskHide", key, hide: !show.checked });
        });
        label.addEventListener("change", () => {
          vscode.postMessage({ type: "setTaskLabel", key, label: label.value });
        });
        emojiPick.addEventListener("click", (event) => {
          event.stopPropagation();
          if (emojiPick.disabled) return;
          emojiKey = key;
          const rect = emojiPick.getBoundingClientRect();
          emojiMenu.style.left = Math.max(8, rect.left) + "px";
          emojiMenu.style.top = (rect.bottom + 4) + "px";
          emojiMenu.hidden = false;
        });
        edit.addEventListener("click", () => {
          if (edit.disabled) return;
          vscode.postMessage({ type: "openTaskSource", key });
        });
        picker.addEventListener("input", () => {
          color.value = picker.value;
          clearTimeout(colorTimer);
          colorTimer = setTimeout(() => {
            vscode.postMessage({ type: "setTaskColor", key, color: picker.value });
          }, 120);
        });
        color.addEventListener("change", () => {
          if (!validHex(color.value)) return;
          vscode.postMessage({ type: "setTaskColor", key, color: normalizeHex(color.value) });
        });
      }
    }

    function applyState(state) {
      statusLine.textContent = state.hasWorkspace
        ? (state.compact
          ? "Menu button only. " + state.visibleCount + " tasks in the list."
          : (state.visibleCount + " of " + state.tasks.length + " tasks on the status bar."))
        : "Open a folder to edit workspace tasks.";
      resetSettings.disabled = !state.hasWorkspace;
      defaultHide.checked = state.defaultHide;
      compact.checked = state.compact;
      limit.disabled = state.compact;
      if (document.activeElement !== defaultColor) defaultColor.value = state.defaultColor;
      if (document.activeElement !== defaultPicker) {
        defaultPicker.value = state.defaultColor.startsWith("#") ? state.defaultColor : "#888888";
      }
      if (document.activeElement !== limit) limit.value = state.limit == null ? "" : String(state.limit);
      if (document.activeElement !== selectIcon) selectIcon.value = state.selectIcon;
      if (document.activeElement !== selectLabel) selectLabel.value = state.selectLabel;
      if (document.activeElement !== selectColor) selectColor.value = state.selectColor;
      if (document.activeElement !== selectPicker) {
        selectPicker.value = state.selectColor.startsWith("#") ? state.selectColor : "#888888";
      }
      runningIndicator.checked = state.runningIndicator;
      runningHighlight.checked = state.runningHighlight;
      renderPreview(state);
      if (!taskList.contains(document.activeElement)) renderTasks(state);
    }

    defaultHide.addEventListener("change", () => {
      vscode.postMessage({ type: "setDefaultHide", enabled: defaultHide.checked });
    });
    compact.addEventListener("change", () => {
      vscode.postMessage({ type: "setCompact", enabled: compact.checked });
    });
    selectIcon.addEventListener("change", () => {
      vscode.postMessage({ type: "setSelectIcon", icon: selectIcon.value });
    });
    defaultPicker.addEventListener("input", () => {
      defaultColor.value = defaultPicker.value;
      clearTimeout(colorTimer);
      colorTimer = setTimeout(() => {
        vscode.postMessage({ type: "setDefaultColor", color: defaultPicker.value });
      }, 120);
    });
    defaultColor.addEventListener("change", () => {
      if (!validHex(defaultColor.value)) return;
      vscode.postMessage({ type: "setDefaultColor", color: normalizeHex(defaultColor.value) });
    });
    limit.addEventListener("change", () => {
      const raw = limit.value.trim();
      vscode.postMessage({
        type: "setLimit",
        limit: raw.length === 0 ? null : Math.max(0, Number(raw)),
      });
    });
    selectLabel.addEventListener("input", () => {
      clearTimeout(textTimer);
      textTimer = setTimeout(() => {
        vscode.postMessage({ type: "setSelectLabel", label: selectLabel.value });
      }, 180);
    });
    selectPicker.addEventListener("input", () => {
      selectColor.value = selectPicker.value;
      clearTimeout(colorTimer);
      colorTimer = setTimeout(() => {
        vscode.postMessage({ type: "setSelectColor", color: selectPicker.value });
      }, 120);
    });
    selectColor.addEventListener("change", () => {
      if (!validHex(selectColor.value)) return;
      vscode.postMessage({ type: "setSelectColor", color: normalizeHex(selectColor.value) });
    });
    runningIndicator.addEventListener("change", () => {
      vscode.postMessage({ type: "setRunningIndicator", enabled: runningIndicator.checked });
    });
    runningHighlight.addEventListener("change", () => {
      vscode.postMessage({ type: "setRunningHighlight", enabled: runningHighlight.checked });
    });
    resetSettings.addEventListener("click", () => {
      vscode.postMessage({ type: "resetSettings" });
    });
    emojiMenu.addEventListener("click", (event) => {
      event.stopPropagation();
      const option = event.target.closest("[data-emoji]");
      if (!option || !emojiKey) return;
      vscode.postMessage({ type: "setTaskEmoji", key: emojiKey, emoji: option.dataset.emoji || "" });
      emojiMenu.hidden = true;
      emojiKey = "";
    });
    document.addEventListener("click", () => {
      emojiMenu.hidden = true;
      emojiKey = "";
    });
    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      emojiMenu.hidden = true;
      emojiKey = "";
    });
    document.getElementById("supportLink").addEventListener("click", (event) => {
      event.preventDefault();
      vscode.postMessage({ type: "openUrl", url: event.currentTarget.getAttribute("href") });
    });
    window.addEventListener("message", (event) => {
      if (event.data?.type === "state") applyState(event.data);
    });
    applyState(${JSON.stringify(state).replaceAll("<", "\\u003c")});
    vscode.postMessage({ type: "ready" });
  </script>
</body>
</html>`;
}
