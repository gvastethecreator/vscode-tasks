import { codiconText, parseCodiconId } from "./codicons.ts";
import { splitLabelEmoji } from "./emoji.ts";
import { compileFileGlob, matchesFileGlob } from "./fileGlob.ts";
import type {
  ColorValue,
  ResolvedAttrs,
  RunKind,
  StatusBarDefaults,
  StatusBarIcon,
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
  if (typeof color !== "string") {
    return;
  }
  const value = color.trim();
  if (
    !value ||
    value.length > 80 ||
    !/^(?:#[\da-f]{3,4}|#[\da-f]{6}|#[\da-f]{8}|[a-z][\w-]*(?:\.[\w-]+)+)$/i.test(value)
  ) {
    return;
  }
  if (value.startsWith("#")) {
    return { type: "hex", value };
  }
  return { type: "theme", value };
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
  return defaults.hide;
}

export function shouldShowForFile(
  fileGlob: string | undefined,
  relativePath: string | undefined,
): boolean {
  return matchesFileGlob(fileGlob, relativePath);
}

export function runKindOf(config: TaskConfig, task?: TaskLike): RunKind {
  if (config.isBackground === true || task?.isBackground === true) {
    return "background";
  }
  return "once";
}

export function runningStatusLabel(kind: RunKind): "Running" | "Online" {
  return kind === "background" ? "Online" : "Running";
}

function iconId(icon: StatusBarIcon | undefined): string | undefined {
  return parseCodiconId(icon?.id);
}

export function formatStatusBarText(attrs: Pick<ResolvedAttrs, "icon" | "label">): string {
  if (!attrs.icon) {
    return attrs.label;
  }
  const stripped = splitLabelEmoji(attrs.label).text || attrs.label;
  return stripped ? `${codiconText(attrs.icon.replace(/~spin$/, ""), attrs.icon.endsWith("~spin"))} ${stripped}` : codiconText(attrs.icon.replace(/~spin$/, ""), attrs.icon.endsWith("~spin"));
}

export function resolveAttrs(
  config: TaskConfig,
  task: TaskLike | undefined,
  defaults: StatusBarDefaults,
  running: boolean,
  highlight = false,
): ResolvedAttrs {
  const statusbar = statusBarOf(config);
  const hide = resolveHide(config, defaults);
  const labelFromBar = pick(statusbar, running, "label");
  const colorFromBar = pick(statusbar, running, "color");
  const backgroundFromBar = pick(statusbar, running, "backgroundColor");
  const detailFromBar = pick(statusbar, false, "detail");
  const fileGlobFromBar = pick(statusbar, false, "fileGlob");
  const kind = runKindOf(config, task);

  const label =
    (typeof labelFromBar === "string" && labelFromBar) ||
    (typeof config.label === "string" && config.label) ||
    task?.name ||
    (typeof config.script === "string" ? config.script : undefined) ||
    "Task";

  const configuredIcon = iconId(statusbar?.icon);
  const runningIcon = running ? iconId(statusbar?.running?.icon) : undefined;
  const icon = running
    ? runningIcon ?? (kind === "once" ? "sync~spin" : configuredIcon ?? "broadcast")
    : configuredIcon;

  const detail =
    (typeof detailFromBar === "string" && detailFromBar) ||
    (typeof config.detail === "string" && config.detail) ||
    task?.detail;

  const color =
    parseColor(colorFromBar) ??
    parseColor(defaults.color);

  const backgroundColor =
    typeof backgroundFromBar === "string"
      ? backgroundFromBar
      : running && highlight
        ? "statusBarItem.warningBackground"
        : undefined;

  const fileGlob =
    typeof fileGlobFromBar === "string" && fileGlobFromBar.trim().length > 0
      ? fileGlobFromBar.trim()
      : undefined;
  const compiledGlob = compileFileGlob(fileGlob);

  return {
    label,
    icon,
    color,
    backgroundColor,
    detail,
    hide,
    runKind: running ? kind : undefined,
    fileGlob,
    fileGlobError: compiledGlob.error,
  };
}
