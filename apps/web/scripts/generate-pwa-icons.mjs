import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const iconsDir = path.join(__dirname, "..", "public", "icons");
const svgPath = path.join(iconsDir, "icon-base.svg");

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

const svg = fs.readFileSync(svgPath);

for (const size of sizes) {
  const out = path.join(iconsDir, `icon-${size}x${size}.png`);
  await sharp(svg).resize(size, size).png().toFile(out);
  console.log("wrote", out);
}
