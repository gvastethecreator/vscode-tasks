import assert from "node:assert/strict";
import { test } from "node:test";
import { codiconText, parseCodiconId, TASK_CODICONS } from "./codicons.ts";

test("only approved task codicons are accepted", () => {
  assert.equal(parseCodiconId(" Play "), "play");
  assert.equal(parseCodiconId("$(play)"), undefined);
  assert.equal(parseCodiconId("not-real"), undefined);
  assert.ok(TASK_CODICONS.includes("run-all"));
});

test("codicon text formatting is controlled by the extension", () => {
  assert.equal(codiconText("sync", true), "$(sync~spin)");
});
