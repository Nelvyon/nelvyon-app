/**
 * Convert raw PNG SaaS marketing shots → WebP (+ optional card crops).
 *
 * Input:  apps/web/public/brand/public/saas-shots/raw/*.png
 * Output: apps/web/public/brand/public/saas-shots/{id}.webp
 *         apps/web/public/brand/public/saas-shots/cards/{id}.webp
 *         apps/web/public/brand/public/saas-shots/manifest.json
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../public/brand/public/saas-shots");
const RAW = path.join(ROOT, "raw");
const CARDS = path.join(ROOT, "cards");

async function main() {
  if (!fs.existsSync(RAW)) {
    console.error(`Missing raw shots dir: ${RAW}`);
    process.exit(1);
  }
  fs.mkdirSync(ROOT, { recursive: true });
  fs.mkdirSync(CARDS, { recursive: true });

  const pngs = fs.readdirSync(RAW).filter((f) => f.endsWith(".png"));
  if (!pngs.length) {
    console.error("No PNG files in raw/");
    process.exit(1);
  }

  const entries = [];
  for (const file of pngs) {
    const id = file.replace(/\.png$/i, "");
    const src = path.join(RAW, file);
    const webp = path.join(ROOT, `${id}.webp`);
    const card = path.join(CARDS, `${id}.webp`);

    const img = sharp(src);
    const meta = await img.metadata();
    await img.webp({ quality: 82, effort: 5 }).toFile(webp);

    // Card crop: top ~62% of viewport (chrome + primary content)
    const h = meta.height ?? 900;
    const w = meta.width ?? 1440;
    const cropH = Math.round(h * 0.62);
    await sharp(src)
      .extract({ left: 0, top: 0, width: w, height: Math.min(cropH, h) })
      .resize({ width: Math.min(960, w), withoutEnlargement: true })
      .webp({ quality: 80, effort: 5 })
      .toFile(card);

    entries.push({
      id,
      hero: `/brand/public/saas-shots/${id}.webp`,
      card: `/brand/public/saas-shots/cards/${id}.webp`,
      width: w,
      height: h,
    });
    console.log(`ok ${id}`);
  }

  let rawManifest = [];
  const rawManifestPath = path.join(RAW, "manifest.json");
  if (fs.existsSync(rawManifestPath)) {
    rawManifest = JSON.parse(fs.readFileSync(rawManifestPath, "utf8"));
  }

  const out = {
    generatedAt: new Date().toISOString(),
    tenant: "Nelvyon Demo · Aether Labs",
    note: "UI real /saas/* con fixtures demo. Sin PII real ni secretos.",
    shots: entries,
    raw: rawManifest,
  };
  fs.writeFileSync(path.join(ROOT, "manifest.json"), JSON.stringify(out, null, 2), "utf8");
  console.log(`Wrote ${entries.length} WebP shots → ${ROOT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
