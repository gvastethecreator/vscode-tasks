import assert from "node:assert/strict";
import { test } from "node:test";
import { runningItemText, showRunningIndicator } from "./runningControls.ts";

const on = { indicator: true, highlight: true };
const off = { indicator: false, highlight: true };

test("idle tasks hide the running indicator", () => {
  assert.equal(showRunningIndicator(on, false), false);
  assert.equal(showRunningIndicator(off, true), false);
  assert.equal(showRunningIndicator(on, true), true);
});

test("running pill glues the bullet to the label", () => {
  assert.equal(runningItemText("echo", false), "echo");
  assert.equal(runningItemText("echo", true), "🟢 echo");
});

test("a spinner replaces the bullet and a leading emoji", () => {
  assert.equal(runningItemText("$(sync~spin) echo", true), "$(sync~spin) echo");
  assert.equal(
    runningItemText("$(sync~spin) 🚀 echo", true),
    "$(sync~spin) echo",
  );
});

test("the bullet replaces a leading emoji", () => {
  assert.equal(runningItemText("🚀 echo", true), "🟢 echo");
  assert.equal(runningItemText("🚀 echo", false), "🚀 echo");
});
