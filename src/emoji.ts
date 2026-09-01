export const TASK_EMOJIS = [
  "▶️",
  "⏸️",
  "⏹️",
  "🔄",
  "⚙️",
  "🛠️",
  "🔨",
  "🔧",
  "📦",
  "🧪",
  "🐛",
  "🚀",
  "✨",
  "✅",
  "❌",
  "⚠️",
  "🔥",
  "💡",
  "📝",
  "📚",
  "🧹",
  "🔍",
  "🎯",
  "🧩",
  "⭐",
  "💾",
  "🌐",
  "🖥️",
  "📁",
  "📄",
  "🔒",
  "🔑",
  "⏱️",
  "📊",
  "🧠",
  "🪄",
  "🟢",
  "🔵",
  "🟡",
  "🔴",
] as const;

const EMOJI_MARK = /\p{Extended_Pictographic}|\p{Regional_Indicator}|[\u2600-\u27BF]/u;

function firstGrapheme(value: string): string {
  const segmenter = new Intl.Segmenter("en", { granularity: "grapheme" });
  return [...segmenter.segment(value)][0]?.segment ?? "";
}

export function splitLabelEmoji(label: string): { emoji: string; text: string } {
  const trimmed = label.trim();
  if (!trimmed) {
    return { emoji: "", text: "" };
  }
  const first = firstGrapheme(trimmed);
  if (first && EMOJI_MARK.test(first)) {
    return { emoji: first, text: trimmed.slice(first.length).trimStart() };
  }
  return { emoji: "", text: trimmed };
}

export function joinLabelEmoji(emoji: string, text: string): string {
  const mark = emoji.trim();
  const body = text.trim();
  if (!mark) {
    return body;
  }
  if (!body) {
    return mark;
  }
  return `${mark} ${body}`;
}
