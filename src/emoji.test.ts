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

test("joinLabelEmoji writes the emoji into the label string", () => {
  assert.equal(joinLabelEmoji("🚀", "build"), "🚀 build");
  assert.equal(joinLabelEmoji("", "build"), "build");
  assert.equal(joinLabelEmoji("🧪", ""), "🧪");
  assert.equal(joinLabelEmoji("▶️", "Watch"), "▶️ Watch");
});

test("replacing the leading emoji does not need a new field", () => {
  const current = splitLabelEmoji("🧪 Test");
  assert.equal(joinLabelEmoji("🚀", current.text), "🚀 Test");
  assert.equal(joinLabelEmoji("", current.text), "Test");
});
