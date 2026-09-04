import { parseCodiconId } from "./codicons.ts";
import { TASK_EMOJIS } from "./emoji.ts";
import { parseTaskIdentityKey } from "./taskIdentity.ts";

export type PanelTaskRow = {
  key: string;
  title: string;
  source: string;
  hide: boolean;
  emoji: string;
  label: string;
  color: string;
  editable: boolean;
  problem?: string;
};

export type PanelState = {
  hasWorkspace: boolean;
  workspaceName: string;
  defaultHide: boolean;
  defaultColor: string;
  limit: number;
  compact: boolean;
  selectLabel: string;
  selectShowLabel: boolean;
  selectColor: string;
  selectIcon: string;
  runningIndicator: boolean;
  runningHighlight: boolean;
  visibleCount: number;
  emojis: readonly string[];
  codicons: readonly string[];
  diagnostics: string[];
  tasks: PanelTaskRow[];
};

export type PanelMessage =
  | { type: "ready" }
  | { type: "setDefaultHide"; enabled: boolean }
  | { type: "setDefaultColor"; color: string }
  | { type: "setLimit"; limit: number }
  | { type: "setCompact"; enabled: boolean }
  | { type: "setSelectLabel"; label: string }
  | { type: "setSelectShowLabel"; enabled: boolean }
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

export const SUPPORT_URL = "https://github.com/gvastethecreator/vscode-tasks";

export function isPanelMessageForKnownTask(
  message: PanelMessage,
  tasks: readonly PanelTaskRow[],
): boolean {
  return !("key" in message) || tasks.some((task) => task.key === message.key);
}

export function parsePanelMessage(value: unknown): PanelMessage | undefined {
  if (!isRecord(value) || typeof value.type !== "string") {
    return;
  }
  switch (value.type) {
    case "ready":
    case "resetSettings":
      return hasExactKeys(value, "type") ? { type: value.type } : undefined;
    case "setDefaultHide":
    case "setCompact":
    case "setSelectShowLabel":
    case "setRunningIndicator":
    case "setRunningHighlight":
      return hasExactKeys(value, "type", "enabled") && typeof value.enabled === "boolean"
        ? { type: value.type, enabled: value.enabled }
        : undefined;
    case "setDefaultColor":
    case "setSelectColor": {
      if (!hasExactKeys(value, "type", "color")) {
        return;
      }
      const color = colorValue(value.color);
      return color === undefined ? undefined : { type: value.type, color };
    }
    case "setLimit":
      return hasExactKeys(value, "type", "limit") &&
        Number.isInteger(value.limit) && Number(value.limit) >= 0 && Number(value.limit) <= 10
        ? { type: value.type, limit: Number(value.limit) }
        : undefined;
    case "setSelectLabel": {
      if (!hasExactKeys(value, "type", "label")) {
        return;
      }
      const label = safeText(value.label, 40);
      return label === undefined ? undefined : { type: value.type, label };
    }
    case "setSelectIcon": {
      if (!hasExactKeys(value, "type", "icon")) {
        return;
      }
      const icon = iconValue(value.icon);
      return icon === undefined ? undefined : { type: value.type, icon };
    }
    case "setTaskHide": {
      if (!hasExactKeys(value, "type", "key", "hide")) {
        return;
      }
      const key = identityKey(value.key);
      return key && typeof value.hide === "boolean"
        ? { type: value.type, key, hide: value.hide }
        : undefined;
    }
    case "setTaskLabel": {
      if (!hasExactKeys(value, "type", "key", "label")) {
        return;
      }
      const key = identityKey(value.key);
      const label = safeText(value.label, 160);
      return key && label !== undefined ? { type: value.type, key, label } : undefined;
    }
    case "setTaskEmoji": {
      if (!hasExactKeys(value, "type", "key", "emoji")) {
        return;
      }
      const key = identityKey(value.key);
      const emoji = emojiValue(value.emoji);
      return key && emoji !== undefined ? { type: value.type, key, emoji } : undefined;
    }
    case "setTaskColor": {
      if (!hasExactKeys(value, "type", "key", "color")) {
        return;
      }
      const key = identityKey(value.key);
      const color = colorValue(value.color);
      return key && color !== undefined ? { type: value.type, key, color } : undefined;
    }
    case "openTaskSource": {
      if (!hasExactKeys(value, "type", "key")) {
        return;
      }
      const key = identityKey(value.key);
      return key ? { type: value.type, key } : undefined;
    }
    case "openUrl":
      return hasExactKeys(value, "type", "url") && value.url === SUPPORT_URL
        ? { type: value.type, url: SUPPORT_URL }
        : undefined;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, ...keys: string[]): boolean {
  const actual = Object.keys(value);
  return actual.length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}

function boundedString(value: unknown, max: number): string | undefined {
  return typeof value === "string" && value.length <= max ? value : undefined;
}

function safeText(value: unknown, max: number): string | undefined {
  const text = boundedString(value, max);
  return text !== undefined && !/\p{Cc}/u.test(text) ? text : undefined;
}

function colorValue(value: unknown): string | undefined {
  const color = boundedString(value, 80);
  if (color === "") {
    return "";
  }
  if (!color) {
    return;
  }
  return /^(?:#[\da-f]{3,4}|#[\da-f]{6}|#[\da-f]{8}|[a-z][\w-]*(?:\.[\w-]+)+)$/i.test(color)
    ? color
    : undefined;
}

function identityKey(value: unknown): string | undefined {
  return typeof value === "string" && parseTaskIdentityKey(value) ? value : undefined;
}

function iconValue(value: unknown): string | undefined {
  if (value === "") {
    return "";
  }
  return parseCodiconId(value);
}

function emojiValue(value: unknown): string | undefined {
  return value === "" || TASK_EMOJIS.includes(value as (typeof TASK_EMOJIS)[number])
    ? String(value)
    : undefined;
}
