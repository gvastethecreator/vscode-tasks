import { joinLabelEmoji, splitLabelEmoji } from "./emoji.ts";
import type { RunningControlSettings } from "./types.ts";

const ONCE_ICON = "$(sync~spin)";
export const RUNNING_BULLET = "🟢";

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
  return showBullet ? joinLabelEmoji(RUNNING_BULLET, body) : label;
}
