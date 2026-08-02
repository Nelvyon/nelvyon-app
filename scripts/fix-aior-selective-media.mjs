/**
 * BLOQUEADO — CEO 2026-08-02:
 * Prohibido sustituir media AIOR por saas-shots / CEO crops.
 * Mantener ilustraciones, mockups, robots y renders originales de AIOR.
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

console.error(
  "BLOCKED: fix-aior-selective-media.mjs is disabled. Keep original AIOR media. Use restore-aior-visuals-keep-content.mjs if needed."
);
process.exit(2);

const ROOT = process.cwd();
const WWW = path.join(ROOT, "apps", "web", "public", "www");
const IMG = path.join(WWW, "assets", "img");
const SHOTS = path.join(ROOT, "apps", "web", "public", "brand", "public", "saas-shots");
const CEO = path.join(ROOT, "scripts", "data", "aior-ceo-visuals");
const EVIDENCE = path.join(ROOT, "docs", "evidence", "public-web-aior-nelvyon");

const require = createRequire(path.join(ROOT, "apps", "web", "package.json"));
const sharp = require("sharp");

const PLACEHOLDER_MAX_BYTES = 20000;
const KEEP_DIRS = /^(favicon|favicons|icon|brand|shape|theme-img)(\/|$)/i;
const KEEP_NAME = /logo|favicon|sprite|mask-shape|price-shape|project-shape|feature-shape|avatar\.svg|element-\d|choose-shape|faq-shape|service-shape|testi-element/i;

/** Fuentes por categoría (orden = prioridad de rotación). */
function listFiles(dir, exts) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => exts.test(f))
    .map((f) => path.join(dir, f))
    .filter((f) => fs.statSync(f).isFile() && fs.statSync(f).size > 5000);
}

const SOURCES = {
  product: listFiles(SHOTS, /^(dashboard|crm|pipeline|analytics|workflows|campanias|billing|inbox|settings)\.webp$/i),
  store: listFiles(SHOTS, /^store\.webp$/i),
  ia: listFiles(CEO, /^(robot-features-orbit|steps-robot-phone|cta-robot-phone-dark|cta-robot-gradient)\.png$/i).concat(
    listFiles(SHOTS, /^(agentes|ai|chat)\.webp$/i)
  ),
  mobile: listFiles(SHOTS, /mobile\.webp$/i).concat(listFiles(CEO, /^cta-agent-phone/i)),
  integra: listFiles(SHOTS, /^integraciones\.webp$/i).concat(
    listFiles(CEO, /^integrations-/i)
  ),
  features: listFiles(CEO, /^feature-tab-/i).concat(listFiles(CEO, /^features-social/i)).concat(
    listFiles(SHOTS, /^(workflows|analytics|ai)\.webp$/i)
  ),
  agency: listFiles(SHOTS, /^(lms|campanias|crm|dashboard)\.webp$/i).concat(
    listFiles(CEO, /^(features-social|cta-robot-gradient)/i)
  ),
  cta: listFiles(CEO, /^cta-robot/i).concat(listFiles(SHOTS, /^(agentes|chat|dashboard)\.webp$/i)),
};

/** Preferencia exacta por nombre de slot AIOR → captura NELVYON. */
const EXACT_SHOT = {
  "dashboard.png": "dashboard.webp",
  "dashboard.jpg": "dashboard.webp",
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
  "integration-logo.png": "integraciones.webp",
  "choose-img-2.jpg": "integraciones.webp",
  "social-img.png": "campanias.webp",
  "cta-image.png": "agentes.webp",
  "cta-image2.png": "chat.webp",
  "download-image2.png": "crm-mobile.webp",
  // hero-img* = composiciones personaje/dispositivo → pool IA (robots CEO), no exact saas
};

function categoryForRel(rel) {
  const r = rel.replace(/\\/g, "/").toLowerCase();
  const base = path.basename(r);
  if (/finance|crypto|wallet|bitcoin|eth\b|binance|solana/.test(r)) return "product";
  if (/store|shop|ecommerce|tienda/.test(r)) return "store";
  if (/integration|social-img|brand_|choose-img/.test(r)) return "integra";
  if (/cta-card|cta-image|cta-img|download-image/.test(r)) return "cta";
  if (/^hero-img|feature_3|feature-item|process-image|robot/.test(base) || /hero\/hero-img/.test(r)) return "ia";
  if (/hero-image|dashboard|project-image|feature_bg|feature-image/.test(r)) return "product";
  if (/pages\/home-ai-agent|pages\/home-ai-chatbot/.test(r)) return "ia";
  if (/pages\/home-productivity|pages\/home-cloud|pages\/home-saas|pages\/home-business/.test(r)) return "product";
  if (/pages\//.test(r)) return "agency";
  if (/blog|case|gallery|service|about|history|video|team|testi|author/.test(r)) return "agency";
  if (/feature/.test(r)) return "features";
  if (/mobile|phone/.test(r)) return "mobile";
  return "product";
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

function shouldReplace(abs, rel) {
  if (KEEP_DIRS.test(rel)) return false;
  if (KEEP_NAME.test(path.basename(rel))) return false;
  if (/\.mp4$/i.test(rel)) return false;
  if (/^nelvyon\//i.test(rel)) return false;
  const size = fs.statSync(abs).size;
  // Placeholders Envato Elements (cajas grises con "W × H")
  if (size <= PLACEHOLDER_MAX_BYTES) return true;
  // Archivos grandes con nombres crypto/finance (si existieran)
  if (/finance|crypto|wallet/i.test(rel)) return true;
  return false;
}

function pickSource(cat, rel, index) {
  const base = path.basename(rel).toLowerCase();
  const exactName = EXACT_SHOT[base];
  if (exactName) {
    const hit = path.join(SHOTS, exactName);
    if (fs.existsSync(hit)) return hit;
  }
  const pool = SOURCES[cat] && SOURCES[cat].length ? SOURCES[cat] : SOURCES.product;
  if (!pool.length) return null;
  return pool[index % pool.length];
}

/** Evita encabezados EN de capturas de sección: prioriza zona visual. */
function extractRegion(srcAbs, cat) {
  const base = path.basename(srcAbs).toLowerCase();
  // Grids de integraciones CEO: recortar zona de iconos (sin título EN)
  if (/integrations-grid|integrations-hub/.test(base)) {
    return sharp(srcAbs)
      .metadata()
      .then((m) => {
        const w = m.width || 800;
        const h = m.height || 600;
        return sharp(srcAbs).extract({
          left: Math.floor(w * 0.05),
          top: Math.floor(h * 0.28),
          width: Math.floor(w * 0.9),
          height: Math.floor(h * 0.65),
        });
      });
  }
  // CTAs / robots CEO: priorizar personaje (izquierda / centro), no copy EN
  if (/^cta-robot|^steps-robot|^robot-features/.test(base)) {
    return sharp(srcAbs)
      .metadata()
      .then((m) => {
        const w = m.width || 800;
        const h = m.height || 600;
        return sharp(srcAbs).extract({
          left: 0,
          top: Math.floor(h * 0.05),
          width: Math.floor(w * 0.55),
          height: Math.floor(h * 0.9),
        });
      });
  }
  if (/^feature-tab-/.test(base)) {
    return sharp(srcAbs)
      .metadata()
      .then((m) => {
        const w = m.width || 800;
        const h = m.height || 600;
        return sharp(srcAbs).extract({
          left: Math.floor(w * 0.45),
          top: Math.floor(h * 0.22),
          width: Math.floor(w * 0.5),
          height: Math.floor(h * 0.7),
        });
      });
  }
  return Promise.resolve(sharp(srcAbs));
}

async function writeFit(srcAbs, destAbs, width, height, cat) {
  const ext = path.extname(destAbs).toLowerCase();
  let pipeline = await extractRegion(srcAbs, cat);
  pipeline = pipeline.rotate().resize(width, height, {
    fit: "cover",
    position: cat === "ia" || cat === "cta" ? "centre" : "attention",
  });
  if (ext === ".jpg" || ext === ".jpeg") {
    pipeline = pipeline.jpeg({ quality: 86, mozjpeg: true });
  } else if (ext === ".webp") {
    pipeline = pipeline.webp({ quality: 86 });
  } else {
    pipeline = pipeline.png({ compressionLevel: 8 });
  }
  await pipeline.toFile(destAbs + ".tmp");
  fs.renameSync(destAbs + ".tmp", destAbs);
}

async function ensureNelvyonCopies() {
  const dest = path.join(IMG, "nelvyon");
  fs.mkdirSync(dest, { recursive: true });
  if (!fs.existsSync(SHOTS)) return;
  for (const f of fs.readdirSync(SHOTS)) {
    if (!/\.(webp|png|jpe?g)$/i.test(f)) continue;
    fs.copyFileSync(path.join(SHOTS, f), path.join(dest, f));
  }
}

async function main() {
  if (!fs.existsSync(WWW)) {
    console.error("Missing www — run brand first");
    process.exit(1);
  }
  if (!SOURCES.product.length) {
    console.error("Missing saas-shots at", SHOTS);
    process.exit(1);
  }

  await ensureNelvyonCopies();

  const all = walk(IMG);
  const report = {
    policy: "selective-replace-placeholders-and-crypto-slots",
    sources: Object.fromEntries(
      Object.entries(SOURCES).map(([k, v]) => [k, v.map((p) => path.relative(ROOT, p).split(path.sep).join("/"))])
    ),
    scanned: all.length,
    replaced: [],
    kept: 0,
    skippedKeepDir: 0,
  };

  let idx = 0;
  for (const { abs, rel } of all) {
    if (KEEP_DIRS.test(rel) || KEEP_NAME.test(path.basename(rel))) {
      report.skippedKeepDir++;
      continue;
    }
    if (!shouldReplace(abs, rel)) {
      report.kept++;
      continue;
    }

    const meta = await sharp(abs).metadata().catch(() => null);
    const w = Math.max(64, meta?.width || 800);
    const h = Math.max(64, meta?.height || 600);
    const cat = categoryForRel(rel);
    const src = pickSource(cat, rel, idx++);
    if (!src) continue;

    const before = fs.statSync(abs).size;
    await writeFit(src, abs, w, h, cat);
    const after = fs.statSync(abs).size;
    report.replaced.push({
      rel,
      category: cat,
      from: path.relative(ROOT, src).split(path.sep).join("/"),
      bytesBefore: before,
      bytesAfter: after,
      size: `${w}x${h}`,
    });
  }

  fs.mkdirSync(EVIDENCE, { recursive: true });
  const out = path.join(EVIDENCE, "media-selective-fix.json");
  fs.writeFileSync(
    out,
    JSON.stringify(
      {
        ...report,
        replacedCount: report.replaced.length,
        summary: {
          scanned: report.scanned,
          replaced: report.replaced.length,
          keptRealOrUntouched: report.kept,
          skippedProtected: report.skippedKeepDir,
        },
      },
      null,
      2
    )
  );

  console.log(
    JSON.stringify(
      {
        scanned: report.scanned,
        replaced: report.replaced.length,
        kept: report.kept,
        protected: report.skippedKeepDir,
        evidence: path.relative(ROOT, out).split(path.sep).join("/"),
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
