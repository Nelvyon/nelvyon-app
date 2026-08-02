/**
 * BLOQUEADO — CEO 2026-08-02:
 * Prohibido sustituir ilustraciones/mockups AIOR por capturas SaaS u otras imágenes.
 * Usar: node scripts/restore-aior-visuals-keep-content.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";

console.error(
  "BLOCKED: fidelity-aior-media-pass.mjs is disabled. Keep original AIOR media. Use restore-aior-visuals-keep-content.mjs if needed."
);
process.exit(2);

const ROOT = process.cwd();
const WWW = path.join(ROOT, "apps", "web", "public", "www");
const IMG = path.join(WWW, "assets", "img");
const SHOTS = path.join(ROOT, "apps", "web", "public", "brand", "public", "saas-shots");
const PHOTOS = path.join(ROOT, "apps", "web", "public", "brand", "public", "library", "photos");
const CEO = path.join(ROOT, "scripts", "data", "aior-ceo-visuals");
const FRAMES = path.join(ROOT, "scripts", "data", "aior-video-frames");
const FRAMES_CLEAN = path.join(FRAMES, "clean");
const EVIDENCE = path.join(ROOT, "docs", "evidence", "public-web-aior-nelvyon");
const BEFORE_DIR = path.join(EVIDENCE, "fidelity-before-after");
const FF = path.join(ROOT, ".tools", "ffmpeg", "ffmpeg.exe");

const require = createRequire(path.join(ROOT, "apps", "web", "package.json"));
const sharp = require("sharp");

const PROTECT_DIR = /^(favicon|favicons|icon|brand|shape|theme-img|nelvyon)(\/|$)/i;
const PROTECT_NAME = /mask-shape|price-shape|project-shape|feature-shape|logo|favicon|sprite|author\.png|avatar\.svg/i;

/** Fuentes CEO con texto EN / chrome de sección — no usar como master. */
const CEO_REJECT = /feature-tab-|features-social|integrations-grid|integrations-hub|cta-agent-phone|cta-robot-gradient|cta-robot-phone-dark|steps-robot-phone/i;
/** CEO aceptable solo con crop agresivo al personaje (sin copy). */
const CEO_ROBOT_OK = /robot-features-orbit/i;

const VIDEOS = [
  path.join(
    process.env.USERPROFILE || "",
    "Videos",
    "Grabaciones de pantalla",
    "Grabación de pantalla 2026-08-02 182505.mp4"
  ),
  path.join(
    process.env.USERPROFILE || "",
    "Videos",
    "Grabaciones de pantalla",
    "Grabación de pantalla 2026-08-02 183413.mp4"
  ),
];

function list(dir, re) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => re.test(f))
    .map((f) => path.join(dir, f))
    .filter((f) => fs.statSync(f).size > 8000);
}

function walk(dir, base = IMG, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, e.name);
    const rel = path.relative(base, abs).split(path.sep).join("/");
    if (e.isDirectory()) walk(abs, base, acc);
    else if (/\.(png|jpe?g|webp|gif)$/i.test(e.name)) acc.push({ abs, rel });
  }
  return acc;
}

function findFfmpeg() {
  if (fs.existsSync(FF)) return FF;
  const wh = spawnSync("where.exe", ["ffmpeg"], { encoding: "utf8" });
  if (wh.status === 0) {
    const line = (wh.stdout || "").split(/\r?\n/).find(Boolean);
    if (line && fs.existsSync(line.trim())) return line.trim();
  }
  return null;
}

function extractFrames(ffmpegBin) {
  fs.mkdirSync(FRAMES, { recursive: true });
  const existing = list(FRAMES, /\.png$/i);
  if (existing.length >= 8) return existing;

  const out = [];
  for (let vi = 0; vi < VIDEOS.length; vi++) {
    const vid = VIDEOS[vi];
    if (!fs.existsSync(vid)) {
      console.warn("Video missing:", vid);
      continue;
    }
    // Muestrear cada ~1.2s; frames limpios se filtran después
    const pattern = path.join(FRAMES, `v${vi + 1}_%03d.png`);
    const r = spawnSync(
      ffmpegBin,
      ["-y", "-i", vid, "-vf", "fps=1/1.2,scale=1280:-1", "-q:v", "2", pattern],
      { encoding: "utf8" }
    );
    if (r.status !== 0) {
      console.warn("ffmpeg failed for", path.basename(vid), (r.stderr || "").slice(-400));
    }
  }
  return list(FRAMES, /\.png$/i);
}

/** Heurística: placeholder Envato = casi plano / muy pequeño / texto dimensional. */
async function isPlaceholderLike(abs, size) {
  const m = await sharp(abs).metadata().catch(() => null);
  const w = m?.width || 0;
  const h = m?.height || 0;
  // Salida previa defectuosa: upscale a dimensiones del placeholder Envato
  if (w > 0 && h > 0 && Math.max(w, h) < 420 && size < 80000) return true;
  if (size < 6000) return true;
  if (size < 16000 && w < 500 && h < 500) return true;
  try {
    const { data, info } = await sharp(abs)
      .resize(32, 32, { fit: "fill" })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    let sum = 0;
    let sumSq = 0;
    const n = info.width * info.height;
    for (let i = 0; i < data.length; i += 3) {
      const g = (data[i] + data[i + 1] + data[i + 2]) / 3;
      sum += g;
      sumSq += g * g;
    }
    const mean = sum / n;
    const variance = sumSq / n - mean * mean;
    if (mean > 180 && variance < 80) return true;
    if (mean > 160 && variance < 40 && size < 25000) return true;
  } catch {
    /* ignore */
  }
  return false;
}

function categoryFor(rel) {
  const r = rel.toLowerCase();
  if (/finance|crypto|wallet/.test(r)) return "product";
  if (/blog|case|gallery|about|history|video|team|testi|author|service|cta-img|counter/.test(r)) return "agency";
  if (/integration|choose|social-img|brand_bg/.test(r)) return "integra";
  if (/hero-img|feature_3|robot|process/.test(r)) return "ia";
  if (/hero-image|dashboard|project-image|feature_bg|breadcumb|bg\//.test(r)) return "product";
  if (/pages\/home-ai-agent|pages\/home-ai-chatbot/.test(r)) return "ia";
  return "product";
}

function buildPools(framesClean) {
  const product = list(SHOTS, /^(dashboard|crm|pipeline|analytics|workflows|campanias|billing|inbox|settings|store|lms)\.webp$/i);
  const ia = list(SHOTS, /^(agentes|ai|chat)\.webp$/i);
  const integra = list(SHOTS, /^integraciones\.webp$/i);
  const mobile = list(SHOTS, /mobile\.webp$/i);
  const photos = list(PHOTOS, /\.(jpg|webp)$/i).filter((p) => !/\.avif$/i.test(p));
  const cleanIntegra = list(FRAMES_CLEAN, /^integrations-/i);
  const cleanPhotos = list(FRAMES_CLEAN, /-hero\.jpg$/i);
  const ceoRobot = list(CEO, CEO_ROBOT_OK);

  // Prioridad: saas → frames limpios → fotos Envato → robot crop CEO
  return {
    product: [...product, ...cleanPhotos, ...photos],
    ia: [...ia, ...ceoRobot, ...product],
    integra: [...integra, ...cleanIntegra, ...product],
    agency: [...product, ...cleanPhotos, ...photos, ...ia],
    mobile: [...mobile, ...product],
  };
}

const EXACT = {
  "dashboard.png": "dashboard.webp",
  "hero-image.png": "dashboard.webp",
  "hero-image3.png": "crm.webp",
  "hero-image4.png": "pipeline.webp",
  "hero-image5.png": "workflows.webp",
  "hero-image6.png": "analytics.webp",
  "process-image.png": "workflows.webp",
  "process-image2.png": "dashboard.webp",
  "feature_3_1.png": "agentes.webp",
  "project-image-1.png": "crm.webp",
  "project-image-2.png": "workflows.webp",
  "project-image-3.png": "ai.webp",
  "project-image-4.png": "campanias.webp",
  "integration-img.png": "integraciones.webp",
  "integration-img2.png": "integraciones.webp",
  "choose-img-2.jpg": "integraciones.webp",
  "cta-image.png": "agentes.webp",
  "cta-image2.png": "chat.webp",
  "download-image2.png": "crm-mobile.webp",
  "about-img1.jpg": "crm.webp",
  "about-img2.png": "dashboard.webp",
  "about-img3.png": "pipeline.webp",
  "about-feature2.jpg": "analytics.webp",
  "about_3_1.jpg": "workflows.webp",
  "video-img.jpg": "ai.webp",
  "video-img2.jpg": "agentes.webp",
  "hero-img-2.jpg": "agentes.webp",
};

function pick(pools, cat, rel, i) {
  const base = path.basename(rel).toLowerCase();
  if (EXACT[base]) {
    const hit = path.join(SHOTS, EXACT[base]);
    if (fs.existsSync(hit)) return hit;
  }
  const pool = pools[cat] && pools[cat].length ? pools[cat] : pools.product;
  return pool[i % pool.length];
}

async function writeFit(srcAbs, destAbs, w, h) {
  const ext = path.extname(destAbs).toLowerCase();
  // El slot HTML/CSS no cambia; el fichero puede ser retina (≥900 en el lado largo)
  const MIN_LONG = 900;
  let tw = w;
  let th = h;
  const long = Math.max(w, h) || 1;
  if (long < MIN_LONG) {
    const scale = MIN_LONG / long;
    tw = Math.max(64, Math.round(w * scale));
    th = Math.max(64, Math.round(h * scale));
  }

  let img = sharp(srcAbs);
  if (CEO_ROBOT_OK.test(path.basename(srcAbs))) {
    const m = await sharp(srcAbs).metadata();
    const W = m.width || 800;
    const H = m.height || 600;
    img = sharp(srcAbs).extract({
      left: Math.floor(W * 0.28),
      top: Math.floor(H * 0.18),
      width: Math.floor(W * 0.44),
      height: Math.floor(H * 0.62),
    });
  }
  let pipeline = img.rotate().resize(tw, th, { fit: "cover", position: "centre" });
  if (ext === ".jpg" || ext === ".jpeg") pipeline = pipeline.jpeg({ quality: 88, mozjpeg: true });
  else if (ext === ".webp") pipeline = pipeline.webp({ quality: 88 });
  else pipeline = pipeline.png({ compressionLevel: 8 });
  await pipeline.toFile(destAbs + ".tmp");
  fs.renameSync(destAbs + ".tmp", destAbs);
}

/** Reemplazar si el archivo actual proviene de CEO con EN (informe previo) o sigue siendo placeholder. */
function priorBadSources() {
  const reportPath = path.join(EVIDENCE, "media-selective-fix.json");
  const bad = new Set();
  if (!fs.existsSync(reportPath)) return bad;
  const rep = JSON.parse(fs.readFileSync(reportPath, "utf8"));
  for (const row of rep.replaced || []) {
    if (CEO_REJECT.test(row.from || "")) bad.add(row.rel);
  }
  return bad;
}

async function main() {
  if (!fs.existsSync(WWW)) {
    console.error("Missing www");
    process.exit(1);
  }

  const ffmpegBin = findFfmpeg();
  let rawFrames = list(FRAMES, /^v\d+_\d+\.png$/i);
  if (ffmpegBin && rawFrames.length < 8) {
    console.log("FFmpeg:", ffmpegBin);
    rawFrames = extractFrames(ffmpegBin);
  }
  const framesClean = list(FRAMES_CLEAN, /\.(png|jpe?g)$/i);
  console.log("Raw frames:", rawFrames.length, "| Clean curated:", framesClean.length, "| FFmpeg:", Boolean(ffmpegBin));

  const pools = buildPools(framesClean);
  const priorBad = priorBadSources();
  const all = walk(IMG);

  fs.mkdirSync(BEFORE_DIR, { recursive: true });
  fs.mkdirSync(path.join(IMG, "nelvyon"), { recursive: true });
  for (const f of fs.readdirSync(SHOTS)) {
    if (/\.(webp|png|jpe?g)$/i.test(f)) {
      fs.copyFileSync(path.join(SHOTS, f), path.join(IMG, "nelvyon", f));
    }
  }

  const report = {
    policy: "fidelity-selective-v2",
    ffmpeg: Boolean(ffmpegBin),
    framesAvailable: framesClean.length,
    rawFramesExtracted: rawFrames.length,
    reviewed: 0,
    keptValid: 0,
    protected: 0,
    replaced: [],
    imperfectPagesHint: [],
    comparatives: [],
  };

  let idx = 0;
  const compareBudget = [
    "normal/dashboard.png",
    "hero/hero-img4.png",
    "normal/integration-img.png",
    "normal/about-img1.jpg",
    "blog/blog_1_1.jpg",
    "normal/feature_3_1.png",
    "pages/home-ai-agent.jpg",
    "service/service_1_1.jpg",
  ];

  for (const { abs, rel } of all) {
    report.reviewed++;
    if (PROTECT_DIR.test(rel) || PROTECT_NAME.test(path.basename(rel))) {
      report.protected++;
      continue;
    }

    const size = fs.statSync(abs).size;
    const forceCrypto = /finance|crypto|wallet/i.test(rel);
    const fromBadCeo = priorBad.has(rel);
    const placeholder = await isPlaceholderLike(abs, size);
    const needs = forceCrypto || fromBadCeo || placeholder;

    if (!needs) {
      report.keptValid++;
      continue;
    }

    const meta = await sharp(abs).metadata().catch(() => null);
    const w = Math.max(64, meta?.width || 800);
    const h = Math.max(64, meta?.height || 600);
    const cat = categoryFor(rel);
    const src = pick(pools, cat, rel, idx++);
    if (!src) continue;

    // Comparativa before (solo muestra)
    if (compareBudget.includes(rel) && report.comparatives.length < 8) {
      const safe = rel.replace(/[\\/]/g, "__");
      const beforePath = path.join(BEFORE_DIR, `before__${safe}`);
      const afterPath = path.join(BEFORE_DIR, `after__${safe}`);
      fs.copyFileSync(abs, beforePath);
      await writeFit(src, abs, w, h);
      fs.copyFileSync(abs, afterPath);
      report.comparatives.push({
        slot: rel,
        before: path.relative(ROOT, beforePath).split(path.sep).join("/"),
        after: path.relative(ROOT, afterPath).split(path.sep).join("/"),
        from: path.relative(ROOT, src).split(path.sep).join("/"),
        reason: forceCrypto ? "crypto-name" : fromBadCeo ? "prior-en-ceo-source" : "placeholder",
      });
    } else {
      await writeFit(src, abs, w, h);
    }

    report.replaced.push({
      rel,
      category: cat,
      from: path.relative(ROOT, src).split(path.sep).join("/"),
      reason: forceCrypto ? "crypto-name" : fromBadCeo ? "prior-en-ceo-source" : "placeholder",
      bytesAfter: fs.statSync(abs).size,
      size: `${w}x${h}`,
    });
  }

  // Páginas con refs a slots aún imperfectos (tiny residual no sustituido por protect)
  const htmlFiles = fs.readdirSync(WWW).filter((f) => f.endsWith(".html") && !f.startsWith("mapa"));
  const stillTiny = new Set(
    walk(IMG)
      .filter(({ abs, rel }) => {
        if (PROTECT_DIR.test(rel) || PROTECT_NAME.test(path.basename(rel))) return false;
        const size = fs.statSync(abs).size;
        if (size < 25000) return true;
        return false;
      })
      .map((x) => x.rel)
  );

  for (const hf of htmlFiles) {
    const html = fs.readFileSync(path.join(WWW, hf), "utf8");
    const hits = [...stillTiny].filter((rel) => html.includes(`assets/img/${rel}`));
    if (hits.length) {
      report.imperfectPagesHint.push({ page: hf, residualTinySlots: hits.slice(0, 12), count: hits.length });
    }
  }

  // Escaneo residual crypto/AIOR en paths de media referenciados
  const residualFlags = [];
  for (const hf of htmlFiles) {
    const html = fs.readFileSync(path.join(WWW, hf), "utf8");
    if (/finance-crypto|wallet|bitcoin|ethereum/i.test(html) && /assets\/img/i.test(html)) {
      // solo flag si hay src de media con esos tokens
      const m = html.match(/assets\/img\/[^"'\s>]*(crypto|wallet|bitcoin|finance)[^"'\s>]*/gi);
      if (m?.length) residualFlags.push({ page: hf, media: [...new Set(m)].slice(0, 5) });
    }
  }
  report.residualCryptoMediaRefs = residualFlags;
  report.summary = {
    slotsReviewed: report.reviewed,
    protectedSkipped: report.protected,
    keptValidOriginalOrGood: report.keptValid,
    replacedThisPass: report.replaced.length,
    imperfectPages: report.imperfectPagesHint.length,
    framesUsed: framesClean.length,
    rawFramesExtracted: rawFrames.length,
    ffmpeg: Boolean(ffmpegBin),
  };

  const out = path.join(EVIDENCE, "media-fidelity-pass.json");
  fs.writeFileSync(out, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report.summary, null, 2));
  console.log("Wrote", path.relative(ROOT, out));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
