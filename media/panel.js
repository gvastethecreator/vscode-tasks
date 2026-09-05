(() => {
  const vscode = acquireVsCodeApi();
  const byId = (id) => document.getElementById(id);
  const statusLine = byId("statusLine");
  const preview = byId("preview");
  const diagnostics = byId("diagnostics");
  const taskList = byId("taskList");
  const emojiMenu = byId("emojiMenu");
  const defaultHide = byId("defaultHide");
  const compact = byId("compact");
  const runningIndicator = byId("runningIndicator");
  const runningHighlight = byId("runningHighlight");
  const limit = byId("limit");
  const pickIcon = byId("pickIcon");
  const pickIconGlyph = byId("pickIconGlyph");
  const pickIconId = byId("pickIconId");
  const iconMenu = byId("iconMenu");
  const showSelectLabel = byId("showSelectLabel");
  const selectLabel = byId("selectLabel");
  const selectColor = byId("selectColor");
  const selectPicker = byId("selectPicker");
  const defaultColor = byId("defaultColor");
  const defaultPicker = byId("defaultPicker");
  const resetSettings = byId("resetSettings");
  const setDefaults = byId("setDefaults");
  const supportLink = byId("supportLink");
  let iconIds = new Set();
  let emojiKey = "";

  const send = (message) => vscode.postMessage(message);

  function text(tag, value, className) {
    const element = document.createElement(tag);
    element.textContent = value;
    if (className) element.className = className;
    return element;
  }

  function colorError(value) {
    return value === "" || /^(?:#[\da-f]{3,4}|#[\da-f]{6}|#[\da-f]{8}|[a-z][\w-]*(?:\.[\w-]+)+)$/i.test(value)
      ? ""
      : "Use a theme color id or #hex color.";
  }

  function pickerValue(value) {
    const hex = value.trim().replace(/^#/, "");
    if (/^[\da-f]{3}$/i.test(hex)) {
      return "#" + [...hex].map((digit) => digit + digit).join("");
    }
    if (/^[\da-f]{6}(?:[\da-f]{2})?$/i.test(hex)) {
      return "#" + hex.slice(0, 6);
    }
    return "#888888";
  }

  function previewColor(value) {
    if (value.startsWith("#")) return value;
    return /^[a-z][\w-]*(?:\.[\w-]+)+$/i.test(value)
      ? "var(--vscode-" + value.replaceAll(".", "-") + ")"
      : "";
  }

  function input(fieldName, value, placeholder, maxLength, disabled) {
    const element = document.createElement("input");
    element.type = "text";
    element.dataset.field = fieldName;
    element.value = value;
    element.placeholder = placeholder;
    element.maxLength = maxLength;
    element.spellcheck = false;
    element.disabled = disabled;
    return element;
  }

  function editIcon() {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 16 16");
    svg.setAttribute("width", "14");
    svg.setAttribute("height", "14");
    svg.setAttribute("aria-hidden", "true");
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("fill", "currentColor");
    path.setAttribute("d", "M13.23 1c.48 0 .94.2 1.28.55l.14.15c.33.36.48.83.43 1.3a1.74 1.74 0 0 1-.55 1.01L5.81 13.2a1.75 1.75 0 0 1-.73.43l-3.38.91a.75.75 0 0 1-.92-.93l.91-3.38c.08-.27.23-.52.44-.72L11.02 1.7A1.75 1.75 0 0 1 13.23 1zm-1.6 1.82L3.05 10.4l-.54 2.03 2.03-.55 8.57-8.57-1.48-1.49z");
    svg.append(path);
    return svg;
  }

  function showEmojiMenu(button, key) {
    emojiKey = key;
    const rect = button.getBoundingClientRect();
    emojiMenu.style.left = Math.max(8, rect.left) + "px";
    emojiMenu.style.top = rect.bottom + 4 + "px";
    emojiMenu.hidden = false;
  }

  function renderTask(task) {
    const disabled = !task.editable;
    const description = task.title + " from " + task.source;
    const article = document.createElement("article");
    article.className = "task";
    article.dataset.key = task.key;
    article.title = task.title + " — " + task.source;

    const showLabel = document.createElement("label");
    showLabel.className = "option show";
    const show = document.createElement("input");
    show.type = "checkbox";
    show.checked = !task.hide;
    show.disabled = disabled;
    show.setAttribute("aria-label", "Show " + description);
    show.addEventListener("change", () => {
      send({ type: "setTaskHide", key: task.key, hide: !show.checked });
    });
    showLabel.append(show);

    const emoji = document.createElement("button");
    emoji.type = "button";
    emoji.className = "emoji-pick";
    emoji.dataset.field = "emoji";
    emoji.textContent = task.emoji || "·";
    emoji.disabled = disabled;
    emoji.setAttribute("aria-label", "Emoji for " + description);
    emoji.setAttribute("aria-haspopup", "listbox");
    emoji.addEventListener("click", (event) => {
      event.stopPropagation();
      if (!emoji.disabled) showEmojiMenu(emoji, task.key);
    });

    const label = input("label", task.label, task.title, 160, disabled);
    label.setAttribute("aria-label", "Label for " + description);
    label.addEventListener("change", () => {
      send({ type: "setTaskLabel", key: task.key, label: label.value });
    });

    const picker = document.createElement("input");
    picker.type = "color";
    picker.dataset.field = "picker";
    picker.value = pickerValue(task.color);
    picker.disabled = disabled;
    picker.setAttribute("aria-label", "Color for " + description);

    const color = input("color", task.color, "#22C1D6", 80, disabled);
    color.setAttribute("aria-label", "Color value for " + description);
    picker.addEventListener("change", () => {
      color.value = picker.value;
      send({ type: "setTaskColor", key: task.key, color: picker.value });
    });
    color.addEventListener("change", () => {
      const value = color.value.trim();
      color.setCustomValidity(colorError(value));
      if (color.reportValidity()) send({ type: "setTaskColor", key: task.key, color: value });
    });

    const edit = document.createElement("button");
    edit.type = "button";
    edit.className = "icon-btn";
    edit.disabled = disabled;
    edit.setAttribute("aria-label", "Edit " + description + " in tasks.json");
    edit.append(editIcon());
    edit.addEventListener("click", () => {
      send({ type: "openTaskSource", key: task.key });
    });

    article.append(showLabel, emoji, label, picker, color, edit);
    if (task.problem) article.append(text("p", task.problem, "problem"));
    return article;
  }

  function renderEmojiMenu(emojis) {
    emojiMenu.replaceChildren();
    const values = ["", ...emojis];
    for (const value of values) {
      const option = document.createElement("button");
      option.type = "button";
      option.className = "emoji-option";
      option.dataset.emoji = value;
      option.textContent = value || "·";
      option.title = value || "None";
      option.setAttribute("aria-label", value || "None");
      emojiMenu.append(option);
    }
  }

  function setIconMenuOpen(open) {
    iconMenu.hidden = !open;
    pickIcon.setAttribute("aria-expanded", open ? "true" : "false");
  }

  function setIconPreview(id) {
    const icon = iconIds.has(id) ? id : "run-all";
    pickIconId.textContent = icon;
    pickIconGlyph.replaceChildren();
    const source = iconMenu.querySelector('[data-icon="' + icon + '"] svg');
    if (source) pickIconGlyph.append(source.cloneNode(true));
    for (const option of iconMenu.querySelectorAll(".icon-option")) {
      option.setAttribute("aria-selected", option.dataset.icon === icon ? "true" : "false");
    }
  }

  function renderPreview(state) {
    preview.replaceChildren();
    if (state.compact) {
      const icon = state.selectIcon || "run-all";
      const shown = state.selectShowLabel && state.selectLabel
        ? "$(" + icon + ") " + state.selectLabel
        : "$(" + icon + ")";
      preview.append(text("span", shown, "pill"));
      return;
    }
    const visible = state.tasks.filter((task) => !task.hide).slice(0, state.limit);
    if (visible.length === 0) {
      preview.append(text("span", "No tasks shown", "pill"));
    } else {
      for (const task of visible) {
        const shown = ((task.emoji ? task.emoji + " " : "") + (task.label || "")).trim();
        const pill = text("span", shown || task.title, "pill");
        const color = previewColor(task.color);
        if (color) pill.style.color = color;
        preview.append(pill);
      }
    }

    const sample = document.createElement("span");
    sample.className = state.runningHighlight ? "running-pill" : "pill";
    const segment = document.createElement("span");
    segment.className = "seg";
    if (state.runningIndicator) {
      const dot = document.createElement("span");
      dot.className = "dot";
      dot.title = "Running";
      segment.append(dot);
    }
    segment.append("echo");
    sample.append(segment);
    preview.append(sample);
  }

  function renderState(state) {
    statusLine.textContent = state.hasWorkspace
      ? state.compact
        ? "Menu button only. " + state.visibleCount + " tasks in the list."
        : Math.min(state.visibleCount, state.limit) + " of " + state.tasks.length + " tasks on the status bar."
      : "Open a folder to edit workspace tasks.";
    defaultHide.checked = state.defaultHide;
    compact.checked = state.compact;
    runningIndicator.checked = state.runningIndicator;
    runningHighlight.checked = state.runningHighlight;
    if (document.activeElement !== limit) limit.value = String(state.limit);
    limit.disabled = state.compact || !state.hasWorkspace;
    showSelectLabel.checked = state.selectShowLabel;
    if (document.activeElement !== selectLabel) selectLabel.value = state.selectLabel;
    selectLabel.disabled = !state.selectShowLabel || !state.hasWorkspace;
    pickIcon.disabled = !state.hasWorkspace;
    iconIds = new Set(state.codicons);
    setIconPreview(state.selectIcon);
    if (document.activeElement !== selectColor) selectColor.value = state.selectColor;
    if (document.activeElement !== selectPicker) selectPicker.value = pickerValue(state.selectColor);
    if (document.activeElement !== defaultColor) defaultColor.value = state.defaultColor;
    if (document.activeElement !== defaultPicker) defaultPicker.value = pickerValue(state.defaultColor);
    resetSettings.disabled = !state.hasWorkspace;

    renderEmojiMenu(state.emojis);

    diagnostics.replaceChildren();
    for (const message of state.diagnostics) diagnostics.append(text("p", message, "diagnostic"));

    if (!taskList.contains(document.activeElement)) {
      taskList.replaceChildren();
      if (state.tasks.length === 0) {
        taskList.append(text("p", "No workspace tasks found.", "muted"));
      } else {
        for (const task of state.tasks) taskList.append(renderTask(task));
      }
    }
    renderPreview(state);
  }

  defaultHide.addEventListener("change", () => {
    send({ type: "setDefaultHide", enabled: defaultHide.checked });
  });
  compact.addEventListener("change", () => {
    send({ type: "setCompact", enabled: compact.checked });
  });
  runningIndicator.addEventListener("change", () => {
    send({ type: "setRunningIndicator", enabled: runningIndicator.checked });
  });
  runningHighlight.addEventListener("change", () => {
    send({ type: "setRunningHighlight", enabled: runningHighlight.checked });
  });
  limit.addEventListener("change", () => {
    const value = Math.min(10, Math.max(0, Math.trunc(Number(limit.value) || 0)));
    limit.value = String(value);
    send({ type: "setLimit", limit: value });
  });
  pickIcon.addEventListener("click", (event) => {
    event.stopPropagation();
    if (!pickIcon.disabled) setIconMenuOpen(iconMenu.hidden);
  });
  iconMenu.addEventListener("click", (event) => {
    event.stopPropagation();
    const target = event.target instanceof Element ? event.target.closest("[data-icon]") : null;
    if (!target) return;
    const icon = target.dataset.icon || "run-all";
    setIconPreview(icon);
    setIconMenuOpen(false);
    send({ type: "setSelectIcon", icon });
  });
  showSelectLabel.addEventListener("change", () => {
    send({ type: "setSelectShowLabel", enabled: showSelectLabel.checked });
  });
  selectLabel.addEventListener("change", () => {
    send({ type: "setSelectLabel", label: selectLabel.value });
  });
  selectPicker.addEventListener("change", () => {
    selectColor.value = selectPicker.value;
    send({ type: "setSelectColor", color: selectPicker.value });
  });
  selectColor.addEventListener("change", () => {
    const value = selectColor.value.trim();
    selectColor.setCustomValidity(colorError(value));
    if (selectColor.reportValidity()) send({ type: "setSelectColor", color: value });
  });
  defaultPicker.addEventListener("change", () => {
    defaultColor.value = defaultPicker.value;
    send({ type: "setDefaultColor", color: defaultPicker.value });
  });
  defaultColor.addEventListener("change", () => {
    const value = defaultColor.value.trim();
    defaultColor.setCustomValidity(colorError(value));
    if (defaultColor.reportValidity()) send({ type: "setDefaultColor", color: value });
  });
  resetSettings.addEventListener("click", () => {
    if (window.confirm("Reset Status Bar Tasks settings?")) send({ type: "resetSettings" });
  });
  setDefaults.addEventListener("click", () => {
    if (window.confirm("Set Status Bar Tasks defaults for all workspaces?")) send({ type: "setDefaults" });
  });
  emojiMenu.addEventListener("click", (event) => {
    event.stopPropagation();
    const target = event.target instanceof Element ? event.target.closest("[data-emoji]") : null;
    if (!target || !emojiKey) return;
    send({ type: "setTaskEmoji", key: emojiKey, emoji: target.dataset.emoji || "" });
    emojiMenu.hidden = true;
    emojiKey = "";
  });
  document.addEventListener("click", () => {
    emojiMenu.hidden = true;
    emojiKey = "";
    setIconMenuOpen(false);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      emojiMenu.hidden = true;
      emojiKey = "";
      setIconMenuOpen(false);
    }
  });
  supportLink.addEventListener("click", (event) => {
    event.preventDefault();
    send({ type: "openUrl", url: supportLink.getAttribute("href") });
  });
  window.addEventListener("message", (event) => {
    const state = event.data;
    if (
      state &&
      state.type === "state" &&
      Array.isArray(state.tasks) &&
      Array.isArray(state.emojis) &&
      Array.isArray(state.codicons)
    ) {
      renderState(state);
    }
  });
  send({ type: "ready" });
})();
