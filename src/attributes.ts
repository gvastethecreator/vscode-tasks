import { splitLabelEmoji } from "./emoji.ts";
import type {
  ColorValue,
  ResolvedAttrs,
  RunKind,
  StatusBarDefaults,
  StatusBarStyle,
  TaskConfig,
  TaskLike,
} from "./types.ts";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function statusBarOf(config: TaskConfig): StatusBarStyle | undefined {
  const options = config.options;
  if (!isObject(options) || !isObject(options.statusbar)) {
    return;
  }
  return options.statusbar as StatusBarStyle;
}

export function parseColor(color: unknown): ColorValue | undefined {
  if (typeof color !== "string" || color.length === 0) {
    return;
  }
  if (color.startsWith("#")) {
    return { type: "hex", value: color };
  }
  return { type: "theme", value: color };
}

function pick<K extends keyof StatusBarStyle>(
  statusbar: StatusBarStyle | undefined,
  running: boolean,
  key: K,
): StatusBarStyle[K] | undefined {
  if (!statusbar) {
    return;
  }
  if (running && statusbar.running && key in statusbar.running) {
    return statusbar.running[key];
  }
  if (key in statusbar) {
    return statusbar[key];
  }
}

export function resolveHide(
  config: TaskConfig,
  defaults: StatusBarDefaults,
): boolean {
  const statusbar = statusBarOf(config);
  const fromBar = pick(statusbar, false, "hide");
  if (typeof fromBar === "boolean") {
    return fromBar;
  }
  if (typeof config.hide === "boolean") {
    return config.hide;
  }
  return defaults.hide;
}

export function shouldShowForFile(
  filePattern: string | undefined,
  filePath: string | undefined,
): boolean {
  if (!filePattern) {
    return true;
  }
  try {
    return Boolean(filePath && new RegExp(filePattern).test(filePath));
  } catch {
    return false;
  }
}

const ONCE_ICON = "$(sync~spin)";

export function runKindOf(config: TaskConfig, task?: TaskLike): RunKind {
  if (config.isBackground === true || task?.isBackground === true) {
    return "background";
  }
  return "once";
}

export function runningStatusLabel(kind: RunKind): "Running" | "Online" {
  return kind === "background" ? "Online" : "Running";
}

export function withRunningMarker(
  label: string,
  running: boolean,
  kind: RunKind = "once",
): string {
  if (!running || kind === "background") {
    return label;
  }
  const stripped = label.replaceAll(ONCE_ICON, "").trim();
  const body = splitLabelEmoji(stripped).text || stripped;
  return body ? `${ONCE_ICON} ${body}` : ONCE_ICON;
}

export function resolveAttrs(
  config: TaskConfig,
  task: TaskLike | undefined,
  defaults: StatusBarDefaults,
  running: boolean,
  highlight = true,
): ResolvedAttrs {
  const statusbar = statusBarOf(config);
  const hide = resolveHide(config, defaults);
  const labelFromBar = pick(statusbar, running, "label");
  const colorFromBar = pick(statusbar, running, "color");
  const backgroundFromBar = pick(statusbar, running, "backgroundColor");
  const detailFromBar = pick(statusbar, false, "detail");
  const filePatternFromBar = pick(statusbar, false, "filePattern");

  const kind = runKindOf(config, task);
  const rawLabel = withRunningMarker(
    (typeof labelFromBar === "string" && labelFromBar) ||
      (typeof config.label === "string" && config.label) ||
      task?.name ||
      (typeof config.script === "string" ? config.script : undefined) ||
      "Task",
    running,
    kind,
  );

  const detail =
    (typeof detailFromBar === "string" && detailFromBar) ||
    (typeof config.detail === "string" && config.detail) ||
    task?.detail;

  const color =
    parseColor(colorFromBar) ??
    parseColor(typeof config.color === "string" ? config.color : undefined) ??
    parseColor(defaults.color);

  const backgroundColor =
    typeof backgroundFromBar === "string"
      ? backgroundFromBar
      : running && highlight
        ? "statusBarItem.warningBackground"
        : undefined;

  const filePattern =
    typeof filePatternFromBar === "string" && filePatternFromBar.length > 0
      ? filePatternFromBar
      : undefined;

  return {
    label: rawLabel,
    color,
    backgroundColor,
    detail,
    hide,
    filePattern,
  };
}
