import type { RunKind } from "./types.ts";

export const DEFAULT_MENU_ICON = "run-all";

export type BusyKind = "once" | "background" | "both";

export function busyKind(kinds: Iterable<RunKind>): BusyKind | undefined {
  let once = false;
  let background = false;
  for (const kind of kinds) {
    if (kind === "background") {
      background = true;
    } else {
      once = true;
    }
  }
  if (once && background) {
    return "both";
  }
  if (once) {
    return "once";
  }
  if (background) {
    return "background";
  }
  return undefined;
}

export function overflowButtonText(input: {
  compact: boolean;
  icon: string;
  label: string;
  busy?: BusyKind;
}): string {
  const icon =
    input.busy === "once" || input.busy === "both"
      ? "sync~spin"
      : input.icon.trim() || (input.compact ? DEFAULT_MENU_ICON : "");
  const label = input.label.trim();
  const showLabel = label.length > 0 && !(input.compact && label === "...");
  if (icon && showLabel) {
    return `$(${icon}) ${label}`;
  }
  if (icon) {
    return `$(${icon})`;
  }
  return label || "...";
}
