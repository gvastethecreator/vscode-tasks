import { joinLabelEmoji, splitLabelEmoji } from "./emoji.ts";
import type { RunningControlSettings } from "./types.ts";

export const RUNNING_BULLET = "🟢";
const ONCE_ICON = "$(sync~spin)";

export type { RunningControlSettings };

export function showRunningIndicator(
  settings: RunningControlSettings,
  running: boolean,
): boolean {
  return running && settings.indicator;
}

export function runningItemText(label: string, showBullet: boolean): string {
  const hasSpinner = label.includes(ONCE_ICON);
  const stripped = label.replaceAll(ONCE_ICON, "").trim();
  const body = splitLabelEmoji(stripped).text || stripped;
  if (hasSpinner) {
    return body ? `${ONCE_ICON} ${body}` : ONCE_ICON;
  }
  if (!showBullet) {
    return label;
  }
  return joinLabelEmoji(RUNNING_BULLET, body);
}
