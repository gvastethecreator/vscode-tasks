import assert from "node:assert/strict";
import { test } from "node:test";
import { joinLabelEmoji, splitLabelEmoji } from "./emoji.ts";

test("splitLabelEmoji reads a leading emoji and leaves the rest", () => {
  assert.deepEqual(splitLabelEmoji("🚀 build"), { emoji: "🚀", text: "build" });
  assert.deepEqual(splitLabelEmoji("🧪"), { emoji: "🧪", text: "" });
  assert.deepEqual(splitLabelEmoji("build"), { emoji: "", text: "build" });
  assert.deepEqual(splitLabelEmoji("$(play) build"), {
    emoji: "",
    text: "$(play) build",
  });
});

test("splitLabelEmoji keeps ZWJ and flag sequences together", () => {
  assert.deepEqual(splitLabelEmoji("🇪🇸 Test"), { emoji: "🇪🇸", text: "Test" });
  assert.deepEqual(splitLabelEmoji("👨‍💻 watch"), { emoji: "👨‍💻", text: "watch" });
});

test("joinLabelEmoji keeps the compact task-row value stable", () => {
  assert.equal(joinLabelEmoji("🚀", "build"), "🚀 build");
  assert.equal(joinLabelEmoji("", "build"), "build");
  assert.equal(joinLabelEmoji("🚀", ""), "🚀");
});
