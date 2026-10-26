import assert from "node:assert/strict";
import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import yauzl from "yauzl";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const requested = process.argv[2];
const filename = requested
  ? path.resolve(root, requested)
  : path.join(
      root,
      (await readdir(root)).find((name) => /^status-bar-tasks(?:-.*)?\.vsix$/.test(name)) || "",
    );
assert.ok(filename.endsWith(".vsix"), "No Status Bar Tasks VSIX found.");
assert.ok((await stat(filename)).size < 5 * 1024 * 1024, "VSIX exceeds the 5 MB budget.");

const { names, contents } = await inspect(filename);
for (const required of [
  "extension/package.json",
  "extension/dist/extension.cjs",
  "extension/media/icon.png",
  "extension/media/preview.png",
  "extension/media/preview-settings.png",
  "extension/media/panel.css",
  "extension/media/panel.js",
  "extension/schemas/tasks.json",
  "extension/schemas/code-workspace.json",
  "extension/readme.md",
  "extension/changelog.md",
  "extension/LICENSE.txt",
]) {
  assert.ok(names.has(required), "Missing packaged file: " + required);
}
for (const name of names) {
  assert.ok(!name.includes(".."), "Unsafe archive entry: " + name);
  assert.ok(!name.startsWith("extension/src/"), "Source file leaked into VSIX: " + name);
  assert.ok(!name.startsWith("extension/test/"), "Test file leaked into VSIX: " + name);
  assert.ok(!name.startsWith("extension/node_modules/"), "Dependency leaked into VSIX: " + name);
  assert.ok(!name.endsWith(".map"), "Source map leaked into VSIX: " + name);
}

const manifest = JSON.parse(contents.get("extension/package.json").toString("utf8"));
assert.equal(manifest.name, "status-bar-tasks");
assert.equal(manifest.version, "0.1.0");
assert.equal(manifest.main, "./dist/extension.cjs");
assert.deepEqual(manifest.extensionKind, ["workspace"]);
assert.equal(manifest.capabilities.untrustedWorkspaces.supported, false);
assert.equal(manifest.capabilities.virtualWorkspaces.supported, false);
const icon = pngMetadata(contents.get("extension/media/icon.png"), "Marketplace icon");
assert.deepEqual([icon.width, icon.height], [256, 256]);
assert.ok(icon.colorType === 4 || icon.colorType === 6, "Marketplace icon must have an alpha channel.");
const preview = pngMetadata(contents.get("extension/media/preview.png"), "Marketplace preview");
assert.deepEqual([preview.width, preview.height], [1200, 800]);
assert.ok(preview.colorType === 4 || preview.colorType === 6, "Marketplace preview must have an alpha channel.");
const settingsPreview = pngMetadata(contents.get("extension/media/preview-settings.png"), "Settings preview");
assert.deepEqual([settingsPreview.width, settingsPreview.height], [1200, 800]);
assert.ok(settingsPreview.colorType === 4 || settingsPreview.colorType === 6, "Settings preview must have an alpha channel.");
console.log("VSIX inspection passed: " + names.size + " entries.");

function inspect(file) {
  return new Promise((resolve, reject) => {
    yauzl.open(file, { lazyEntries: true }, (error, zip) => {
      if (error || !zip) {
        reject(error || new Error("Could not open VSIX."));
        return;
      }
      const names = new Set();
      const contents = new Map();
      const collected = new Set([
        "extension/package.json",
        "extension/media/icon.png",
        "extension/media/preview.png",
        "extension/media/preview-settings.png",
      ]);
      zip.on("error", reject);
      zip.on("end", () => resolve({ names, contents }));
      zip.on("entry", (entry) => {
        names.add(entry.fileName);
        if (!collected.has(entry.fileName)) {
          zip.readEntry();
          return;
        }
        zip.openReadStream(entry, (streamError, stream) => {
          if (streamError || !stream) {
            reject(streamError || new Error("Could not read packaged manifest."));
            return;
          }
          const chunks = [];
          stream.on("data", (chunk) => chunks.push(chunk));
          stream.on("error", reject);
          stream.on("end", () => {
            contents.set(entry.fileName, Buffer.concat(chunks));
            zip.readEntry();
          });
        });
      });
      zip.readEntry();
    });
  });
}

function pngMetadata(buffer, label) {
  assert.ok(buffer, label + " is missing.");
  assert.equal(buffer.subarray(0, 8).toString("hex"), "89504e470d0a1a0a", label + " must be PNG.");
  assert.equal(buffer.subarray(12, 16).toString("ascii"), "IHDR", label + " has no IHDR chunk.");
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
    colorType: buffer.readUInt8(25),
  };
}
