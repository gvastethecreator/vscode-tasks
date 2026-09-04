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

console.log("Rendered approved raster icon.");
