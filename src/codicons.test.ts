import assert from "node:assert/strict";
import { test } from "node:test";
import { codiconText, parseCodiconId, TASK_CODICONS } from "./codicons.ts";
import { MENU_ICON_SVG } from "./menuIconSvg.ts";

test("only approved task codicons are accepted", () => {
  assert.equal(parseCodiconId(" Play "), "play");
  assert.equal(parseCodiconId("$(play)"), undefined);
  assert.equal(parseCodiconId("not-real"), undefined);
  assert.ok(TASK_CODICONS.includes("run-all"));
  for (const id of TASK_CODICONS) {
    assert.ok(MENU_ICON_SVG[id], id);
  }
});

test("codicon text formatting is controlled by the extension", () => {
  assert.equal(codiconText("sync", true), "$(sync~spin)");
});
