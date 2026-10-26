import assert from "node:assert/strict";
import { test } from "node:test";
import { busyKind, overflowButtonText } from "./overflowButton.ts";

test("compact mode uses a task icon when no custom icon is set", () => {
  assert.equal(
    overflowButtonText({ compact: true, icon: "", label: "..." }),
    "$(run-all)",
  );
  assert.equal(
    overflowButtonText({ compact: true, icon: "play", label: "..." }),
    "$(play)",
  );
  assert.equal(
    overflowButtonText({ compact: true, icon: "", label: "tasks" }),
    "$(run-all) tasks",
  );
  assert.equal(
    overflowButtonText({ compact: false, icon: "run-all", label: "tasks", showLabel: false }),
    "$(run-all)",
  );
});

test("running compact menu uses a spinner", () => {
  assert.equal(
    overflowButtonText({
      compact: true,
      icon: "play",
      label: "...",
      busy: "once",
    }),
    "$(sync~spin)",
  );
});

test("online compact menu keeps the menu icon", () => {
  assert.equal(
    overflowButtonText({
      compact: true,
      icon: "play",
      label: "...",
      busy: "background",
    }),
    "$(play)",
  );
});

test("mixed busy prefers the spinner", () => {
  assert.equal(
    overflowButtonText({
      compact: false,
      icon: "",
      label: "...",
      busy: "both",
    }),
    "$(sync~spin) ...",
  );
});

test("busyKind collapses running kinds", () => {
  assert.equal(busyKind([]), undefined);
  assert.equal(busyKind(["once"]), "once");
  assert.equal(busyKind(["background"]), "background");
  assert.equal(busyKind(["once", "background"]), "both");
});

test("full mode keeps the dots unless an icon is set", () => {
  assert.equal(
    overflowButtonText({ compact: false, icon: "", label: "..." }),
    "...",
  );
  assert.equal(
    overflowButtonText({ compact: false, icon: "list-flat", label: "..." }),
    "$(list-flat) ...",
  );
});
