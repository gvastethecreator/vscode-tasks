import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { TASK_CODICONS } from "./codicons.ts";

function json(path: string): Record<string, any> {
  return JSON.parse(readFileSync(path, "utf8")) as Record<string, any>;
}

test("manifest narrows task schema contributions", () => {
  const manifest = json("package.json");
  assert.deepEqual(
    manifest.contributes.jsonValidation.map((entry: { fileMatch: string }) => entry.fileMatch),
    ["**/.vscode/tasks.json", "*.code-workspace"],
  );
});

test("manifest and task schema share the runtime codicon allowlist", () => {
  const manifest = json("package.json");
  const schema = json("schemas/tasks.json");
  const settingIcons =
    manifest.contributes.configuration.properties["tasks.statusbar.select.icon"].enum;
  const taskIcons = schema.definitions.icon.properties.id.enum.filter(
    (value: unknown) => value !== null,
  );
  assert.deepEqual(settingIcons, TASK_CODICONS);
  assert.deepEqual(taskIcons, TASK_CODICONS);
});

test("schema exposes fileGlob and removes executable regex metadata", () => {
  const schema = json("schemas/tasks.json");
  const fields = schema.definitions.statusbar.properties;
  assert.ok(fields.fileGlob);
  assert.equal(fields.filePattern, undefined);
  assert.equal(fields.fileGlob.maxLength, 256);
  assert.equal(fields.detail.maxLength, 512);
  assert.equal(schema.definitions.color.maxLength, 80);
  assert.equal(schema.definitions.color.format, undefined);
  const color = new RegExp(schema.definitions.color.pattern);
  assert.equal(color.test("statusBar.foreground"), true);
  assert.equal(color.test("red"), false);
});
