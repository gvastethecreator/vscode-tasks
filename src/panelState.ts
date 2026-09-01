export type PanelTaskRow = {
  key: string;
  title: string;
  hide: boolean;
  emoji: string;
  label: string;
  color: string;
  editable: boolean;
};

export type PanelState = {
  hasWorkspace: boolean;
  workspaceName: string;
  defaultHide: boolean;
  defaultColor: string;
  limit: number | null;
  compact: boolean;
  selectLabel: string;
  selectColor: string;
  selectIcon: string;
  runningIndicator: boolean;
  runningHighlight: boolean;
  visibleCount: number;
  emojis: readonly string[];
  tasks: PanelTaskRow[];
};

export type PanelMessage =
  | { type: "ready" }
  | { type: "setDefaultHide"; enabled: boolean }
  | { type: "setDefaultColor"; color: string }
  | { type: "setLimit"; limit: number | null }
  | { type: "setCompact"; enabled: boolean }
  | { type: "setSelectLabel"; label: string }
  | { type: "setSelectColor"; color: string }
  | { type: "setSelectIcon"; icon: string }
  | { type: "setRunningIndicator"; enabled: boolean }
  | { type: "setRunningHighlight"; enabled: boolean }
  | { type: "setTaskHide"; key: string; hide: boolean }
  | { type: "setTaskLabel"; key: string; label: string }
  | { type: "setTaskEmoji"; key: string; emoji: string }
  | { type: "setTaskColor"; key: string; color: string }
  | { type: "openTaskSource"; key: string }
  | { type: "resetSettings" }
  | { type: "openUrl"; url: string };

export const SUPPORT_URL = "https://github.com/gvastethecreator/status-bar-tasks";

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function nonce(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  for (let i = 0; i < 32; i++) {
    out += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return out;
}

export function taskOriginKey(uri: string, index: number): string {
  return `${uri}::${index}`;
}

export function parseTaskOriginKey(
  key: string,
): { uri: string; index: number } | undefined {
  const at = key.lastIndexOf("::");
  if (at <= 0) {
    return;
  }
  const index = Number(key.slice(at + 2));
  if (!Number.isInteger(index) || index < 0) {
    return;
  }
  return { uri: key.slice(0, at), index };
}
