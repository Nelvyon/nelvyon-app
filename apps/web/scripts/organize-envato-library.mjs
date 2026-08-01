/**
 * Organize Envato downloads → publishable visual library.
 *
 * Input:  .reference/envato-public-assets/ (root + photos/videos/mockups/icons)
 * Output: apps/web/public/brand/public/library/
 *         .reference/envato-public-assets/_organized/ (canonical raw by ID)
 *         apps/web/public/brand/public/library/manifest.json
 *
 * Usage: node apps/web/scripts/organize-envato-library.mjs
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, "../../..");
const SRC = path.join(REPO, ".reference/envato-public-assets");
const ORGANIZED = path.join(SRC, "_organized");
const OUT = path.resolve(__dirname, "../public/brand/public/library");

/** Filename slug → library ID (P0 catalog). */
const ASSET_MAP = [
  { id: "F-01", kind: "photo", match: /business-team-collaborating-in-modern-office/i },
  { id: "F-02", kind: "photo", match: /contemporary-business-center-with-rows-of-computer/i },
  { id: "M-01", kind: "mockup", match: /high-quality-macbook-pro-mockup-realistic-laptop/i },
  { id: "M-04", kind: "mockup", match: /apple-products-multi-screen-mockups/i },
  { id: "M-07", kind: "mockup", match: /high-quality-realistic-desktop-monitor-mockup/i },
  { id: "M-09", kind: "mockup", match: /monitor-mockup-monitor/i },
  { id: "I-01", kind: "icons", match: /^saas-icons-/i },
  { id: "I-02", kind: "icons", match: /marketing-automation-and-crm-icons/i },
  { id: "I-03", kind: "icons", match: /crm-strategy-sales-pipeline-icons/i },
  { id: "I-04", kind: "icons", match: /business-automation-icon-set/i },
  { id: "I-05", kind: "icons", match: /database-server-icons/i },
  { id: "I-06", kind: "icons", match: /web-hosting-icons/i },
  { id: "V-01", kind: "video", match: /team-meeting-at-modern-workplace|business-people-teamwork/i },
  { id: "V-02", kind: "video", match: /modern-office-workspace-featuring-several-desks/i },
  { id: "V-03", kind: "video", match: /team-collaboration-at-modern|workday-business-team/i },
];

const PHOTO_MAX_W = 2400;
const WEB_QUALITY = 82;

function sha256File(filePath) {
  const hash = crypto.createHash("sha256");
  hash.update(fs.readFileSync(filePath));
  return hash.digest("hex");
}

function walkFiles(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name.startsWith("_") || ent.name === ".DS_Store") continue;
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walkFiles(full, acc);
    else acc.push(full);
  }
  return acc;
}

function classify(filePath) {
  const base = path.basename(filePath);
  for (const row of ASSET_MAP) {
    if (row.match.test(base)) return row;
  }
  return null;
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function safeSlug(name) {
  return name
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function extractZip(zipPath, dest) {
  ensureDir(dest);
  // PowerShell Expand-Archive is reliable on Windows for standard zips
  if (process.platform === "win32") {
    execFileSync(
      "powershell.exe",
      ["-NoProfile", "-Command", `Expand-Archive -LiteralPath '${zipPath.replace(/'/g, "''")}' -DestinationPath '${dest.replace(/'/g, "''")}' -Force`],
      { stdio: "inherit" },
    );
  } else {
    execFileSync("unzip", ["-o", zipPath, "-d", dest], { stdio: "inherit" });
  }
}

function collectPublishable(extractRoot, exts) {
  const files = walkFiles(extractRoot);
  return files.filter((f) => {
    const ext = path.extname(f).toLowerCase();
    const norm = f.replace(/\\/g, "/");
    if (norm.includes("__MACOSX") || norm.includes("/._")) return false;
    return exts.includes(ext);
  });
}

async function optimizePhoto(srcFile, id) {
  const photosDir = path.join(OUT, "photos");
  ensureDir(photosDir);
  const img = sharp(srcFile).rotate();
  const meta = await img.metadata();
  const pipeline = sharp(srcFile)
    .rotate()
    .resize({ width: PHOTO_MAX_W, withoutEnlargement: true });

  const webpPath = path.join(photosDir, `${id}.webp`);
  const avifPath = path.join(photosDir, `${id}.avif`);
  const jpgPath = path.join(photosDir, `${id}.jpg`);

  await pipeline.clone().webp({ quality: WEB_QUALITY, effort: 5 }).toFile(webpPath);
  await pipeline.clone().avif({ quality: 55, effort: 4 }).toFile(avifPath);
  await pipeline.clone().jpeg({ quality: 88, mozjpeg: true }).toFile(jpgPath);

  const webpStat = fs.statSync(webpPath);
  return {
    id,
    kind: "photo",
    src: `/brand/public/library/photos/${id}.webp`,
    avif: `/brand/public/library/photos/${id}.avif`,
    jpg: `/brand/public/library/photos/${id}.jpg`,
    width: meta.width,
    height: meta.height,
    bytesWebp: webpStat.size,
  };
}

function publishIcons(id, extractRoot) {
  const outDir = path.join(OUT, "icons", id);
  ensureDir(outDir);
  const svgs = collectPublishable(extractRoot, [".svg"]);
  const pngs = collectPublishable(extractRoot, [".png"]);
  const preferred = svgs.length ? svgs : pngs;
  const published = [];
  const used = new Set();

  for (const file of preferred) {
    let slug = safeSlug(path.basename(file));
    if (!slug) continue;
    if (used.has(slug)) slug = `${slug}-${published.length}`;
    used.add(slug);
    const ext = path.extname(file).toLowerCase();
    const dest = path.join(outDir, `${slug}${ext}`);
    fs.copyFileSync(file, dest);
    published.push({
      slug,
      src: `/brand/public/library/icons/${id}/${slug}${ext}`,
      format: ext.slice(1),
    });
  }
  return published;
}

async function main() {
  if (!fs.existsSync(SRC)) {
    console.error(`Missing source: ${SRC}`);
    process.exit(1);
  }

  ensureDir(ORGANIZED);
  ensureDir(OUT);
  ensureDir(path.join(OUT, "photos"));
  ensureDir(path.join(OUT, "icons"));
  ensureDir(path.join(OUT, "videos"));
  ensureDir(path.join(OUT, "mockups"));

  const allFiles = walkFiles(SRC).filter((f) => !f.includes(`${path.sep}_organized${path.sep}`) && !f.includes(`${path.sep}_staging${path.sep}`));
  const byHash = new Map();
  const inventory = [];
  const duplicates = [];

  for (const file of allFiles) {
    const hash = sha256File(file);
    const cls = classify(file);
    const entry = {
      path: path.relative(SRC, file),
      abs: file,
      hash,
      size: fs.statSync(file).size,
      ext: path.extname(file).toLowerCase(),
      id: cls?.id ?? null,
      kind: cls?.kind ?? "unknown",
    };
    if (byHash.has(hash)) {
      duplicates.push({ keep: byHash.get(hash).path, drop: entry.path, hash });
      continue;
    }
    byHash.set(hash, entry);
    inventory.push(entry);
  }

  console.log(`Unique files: ${inventory.length}; duplicates skipped: ${duplicates.length}`);

  const photos = [];
  const icons = {};
  const mockups = [];
  const videos = [];
  const unknown = [];

  for (const entry of inventory) {
    if (!entry.id) {
      unknown.push(entry.path);
      continue;
    }

    const destDir = path.join(ORGANIZED, entry.id);
    ensureDir(destDir);
    const destName = path.basename(entry.path).replace(/ \(\d+\)/, "");
    const destFile = path.join(destDir, destName);
    if (!fs.existsSync(destFile)) fs.copyFileSync(entry.abs, destFile);

    if (entry.kind === "photo" && /\.(jpe?g|png|webp|tif{1,2})$/i.test(entry.ext)) {
      const meta = await optimizePhoto(destFile, entry.id);
      photos.push(meta);
      console.log(`photo ${entry.id} → webp/avif`);
      continue;
    }

    if (entry.kind === "icons" && entry.ext === ".zip") {
      const extractTo = path.join(ORGANIZED, entry.id, "_extract");
      if (!fs.existsSync(extractTo) || !fs.readdirSync(extractTo).length) {
        console.log(`extract ${entry.id}…`);
        extractZip(destFile, extractTo);
      }
      const published = publishIcons(entry.id, extractTo);
      icons[entry.id] = {
        id: entry.id,
        count: published.length,
        items: published,
        note: "SVG/PNG from Envato pack; curated subset mapped in visualLibrary.ts",
      };
      console.log(`icons ${entry.id}: ${published.length} files`);
      continue;
    }

    if (entry.kind === "mockup" && entry.ext === ".zip") {
      mockups.push({
        id: entry.id,
        sourceZip: `/brand/public/library — PSD retained in .reference/_organized/${entry.id}`,
        format: "psd-only",
        note: "Device frames rendered in CSS (DeviceMockup) with saas-shots screens. PSD kept for optional Photoshop composition.",
        organizedPath: path.relative(REPO, destFile),
      });
      // Write stub readme in public mockups
      const stub = path.join(OUT, "mockups", `${entry.id}.md`);
      fs.writeFileSync(
        stub,
        `# ${entry.id}\n\nPSD mockup pack (Envato). Web integration uses CSS DeviceMockup + \`saas-shots\`.\nRaw: \`.reference/envato-public-assets/_organized/${entry.id}/\`\n`,
        "utf8",
      );
      console.log(`mockup ${entry.id}: PSD archived (web uses DeviceMockup)`);
      continue;
    }

    if (entry.kind === "video") {
      const vDir = path.join(OUT, "videos");
      ensureDir(vDir);
      const outName = `${entry.id}${entry.ext}`;
      fs.copyFileSync(destFile, path.join(vDir, outName));
      videos.push({
        id: entry.id,
        src: `/brand/public/library/videos/${outName}`,
      });
      console.log(`video ${entry.id}`);
    }
  }

  // Remove known duplicate loose copies from photos/ and icons/ folders (keep organized + root canonical)
  for (const dup of duplicates) {
    const dropAbs = path.join(SRC, dup.drop);
    // Only auto-delete if under photos/ or icons/ or "(1)" suffix in root
    const rel = dup.drop.replace(/\\/g, "/");
    const isSafeDelete =
      rel.startsWith("photos/") ||
      rel.startsWith("icons/") ||
      /\(\d+\)\./.test(path.basename(rel));
    if (isSafeDelete && fs.existsSync(dropAbs)) {
      fs.unlinkSync(dropAbs);
      console.log(`removed duplicate: ${rel}`);
    }
  }

  const missingP0 = [
    ...Array.from({ length: 24 }, (_, i) => `F-${String(i + 1).padStart(2, "0")}`),
    "V-01",
    "V-02",
    "V-03",
    ...Array.from({ length: 9 }, (_, i) => `M-${String(i + 1).padStart(2, "0")}`),
    ...Array.from({ length: 6 }, (_, i) => `I-${String(i + 1).padStart(2, "0")}`),
  ].filter((id) => {
    if (id.startsWith("F-")) return !photos.find((p) => p.id === id);
    if (id.startsWith("V-")) return !videos.find((v) => v.id === id);
    if (id.startsWith("M-")) return !mockups.find((m) => m.id === id);
    if (id.startsWith("I-")) return !icons[id];
    return true;
  });

  const manifest = {
    generatedAt: new Date().toISOString(),
    source: ".reference/envato-public-assets",
    output: "apps/web/public/brand/public/library",
    photos,
    icons,
    mockups,
    videos,
    duplicatesRemoved: duplicates.length,
    unknownUnmapped: unknown,
    missingP0,
    rules: {
      productUi: "Always use /brand/public/saas-shots/*.webp inside device mockups",
      mockupPsd: "PSD packs stay in _organized; web uses DeviceMockup CSS frames",
      noDeploy: "CEO visual approval required before production deploy",
    },
  };

  fs.writeFileSync(path.join(OUT, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
  fs.writeFileSync(path.join(ORGANIZED, "INVENTORY.json"), JSON.stringify(manifest, null, 2), "utf8");

  console.log("\n=== SUMMARY ===");
  console.log(`photos: ${photos.length}`);
  console.log(`icon packs: ${Object.keys(icons).length}`);
  console.log(`mockups (PSD archived): ${mockups.length}`);
  console.log(`videos: ${videos.length}`);
  console.log(`missing P0: ${missingP0.length} → ${missingP0.join(", ")}`);
  console.log(`manifest → ${path.join(OUT, "manifest.json")}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
