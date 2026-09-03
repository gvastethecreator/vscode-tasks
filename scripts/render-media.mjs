import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const media = path.join(root, "media");

await sharp(path.join(media, "source", "status-bar-tasks-approved.png"))
  .ensureAlpha()
  .resize(256, 256, { fit: "contain" })
  .png()
  .toFile(path.join(media, "icon.png"));

const width = 1120;
const height = 720;
const rounded = await sharp(path.join(media, "source", "status-bar-tasks-preview.png"))
  .resize(width, height, { fit: "fill" })
  .ensureAlpha()
  .composite([
    {
      input: Buffer.from(`<svg width="${width}" height="${height}"><rect width="100%" height="100%" rx="18" fill="white"/></svg>`),
      blend: "dest-in",
    },
  ])
  .png()
  .toBuffer();

await sharp({ create: { width: 1200, height: 800, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite([{ input: rounded, left: 40, top: 40 }])
  .png()
  .toFile(path.join(media, "preview.png"));

console.log("Rendered approved raster icon and native-alpha runtime preview.");
