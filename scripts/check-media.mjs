import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const media = path.join(root, "media");
const source = path.join(media, "source", "status-bar-tasks-approved.png");
const expectedIcon = await sharp(source).ensureAlpha().resize(256, 256, { fit: "contain" }).png().toBuffer();
const actualIcon = await readFile(path.join(media, "icon.png"));
assert.deepEqual(actualIcon, expectedIcon, "media/icon.png is not a direct render of the approved raster source.");

await verifyAlphaPng(path.join(media, "icon.png"), 256, 256, "Marketplace icon");
await verifyAlphaPng(path.join(media, "preview.png"), 1200, 800, "Marketplace preview");
console.log("Media checks passed: approved raster icon and native-alpha 1200x800 preview.");

async function verifyAlphaPng(filename, width, height, label) {
  const image = sharp(filename);
  const metadata = await image.metadata();
  assert.equal(metadata.format, "png", `${label} must be PNG.`);
  assert.equal(metadata.width, width, `${label} width changed.`);
  assert.equal(metadata.height, height, `${label} height changed.`);
  assert.equal(metadata.channels, 4, `${label} must carry native alpha.`);
  const { data, info } = await image.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const alpha = info.channels - 1;
  const corners = [
    alpha,
    (info.width - 1) * info.channels + alpha,
    (info.height - 1) * info.width * info.channels + alpha,
    (info.width * info.height - 1) * info.channels + alpha,
  ];
  assert.ok(corners.every((offset) => data[offset] === 0), `${label} corners must be transparent.`);
}
