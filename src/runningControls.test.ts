import assert from "node:assert/strict";
import { test } from "node:test";
import {
  runningItemText,
  RUNNING_BULLET,
  showRunningIndicator,
} from "./runningControls.ts";

test("running indicator is opt-in and only applies while running", () => {
  assert.equal(showRunningIndicator({ indicator: true, highlight: false }, true), true);
  assert.equal(showRunningIndicator({ indicator: false, highlight: false }, true), false);
  assert.equal(showRunningIndicator({ indicator: true, highlight: false }, false), false);
});

test("spinner stays singular and background tasks can use the green bullet", () => {
  assert.equal(runningItemText("$(sync~spin) build", true), "$(sync~spin) build");
  assert.equal(runningItemText("$(server) dev", true), `${RUNNING_BULLET} $(server) dev`);
  assert.equal(runningItemText("$(server) dev", false), "$(server) dev");
});
