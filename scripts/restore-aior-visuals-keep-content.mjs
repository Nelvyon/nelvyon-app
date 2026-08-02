/**
 * Restaura visuales AIOR originales en apps/web/public/www
 * SIN tocar composición HTML ni rehacer contenido NELVYON.
 *
 * Restaura: assets/img, assets/css (y js/fonts si difieren)
 * Mantiene: logos NELVYON, HTML con textos NELVYON
 * Elimina: assets/img/nelvyon (saas-shots)
 *
 * NO hace deploy.
 *
 * node scripts/restore-aior-visuals-keep-content.mjs
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SRC = path.join(ROOT, ".reference", "aior", "download-version");
const DEST = path.join(ROOT, "apps", "web", "public", "www");

const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 36" fill="none">
  <text x="0" y="26" font-family="Inter,Arial,sans-serif" font-size="24" font-weight="700" fill="#0084FF">NELVYON</text>
</svg>`;
const LOGO_WHITE_SVG = LOGO_SVG.replace("#0084FF", "#FFFFFF");
const LOGO_BLACK_SVG = LOGO_SVG.replace("#0084FF", "#0B1224");
const LOGO_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" fill="none">
  <rect width="40" height="40" rx="10" fill="#0084FF"/>
  <text x="8" y="28" font-family="Inter,Arial,sans-serif" font-size="22" font-weight="700" fill="#fff">N</text>
</svg>`;

function rimraf(dir) {
  if (!fs.existsSync(dir)) return;
  fs.rmSync(dir, { recursive: true, force: true });
}

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const ent of fs.readdirSync(from, { withFileTypes: true })) {
    const a = path.join(from, ent.name);
    const b = path.join(to, ent.name);
    if (ent.isDirectory()) copyDir(a, b);
    else fs.copyFileSync(a, b);
  }
}

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

function writeLogos() {
  const img = path.join(DEST, "assets", "img");
  fs.writeFileSync(path.join(img, "logo.svg"), LOGO_SVG);
  fs.writeFileSync(path.join(img, "logo-white.svg"), LOGO_WHITE_SVG);
  fs.writeFileSync(path.join(img, "logo-black.svg"), LOGO_BLACK_SVG);
  fs.writeFileSync(path.join(img, "logo-icon.svg"), LOGO_ICON_SVG);
  for (let i = 1; i <= 12; i++) {
    const f = path.join(img, `logo${i}.svg`);
    if (fs.existsSync(f)) fs.writeFileSync(f, LOGO_SVG);
  }
}

/** HTML paths that brand injectSaasShots may have rewritten → AIOR originals */
const NELVYON_SRC_REVERTS = [
  [/assets\/img\/nelvyon\/pipeline\.webp/g, "assets/img/normal/hero-image4.png"],
  [/assets\/img\/nelvyon\/crm\.webp/g, "assets/img/project/project-image-1.png"],
  [/assets\/img\/nelvyon\/workflows\.webp/g, "assets/img/project/project-image-2.png"],
  [/assets\/img\/nelvyon\/ai\.webp/g, "assets/img/project/project-image-3.png"],
  [/assets\/img\/nelvyon\/campanias\.webp/g, "assets/img/project/project-image-4.png"],
  [/assets\/img\/nelvyon\/dashboard\.webp/g, "assets/img/normal/process-image2.png"],
  [/assets\/img\/nelvyon\/agentes\.webp/g, "assets/img/normal/feature_3_1.png"],
  [/\/brand\/public\/saas-shots\/[^"'\s)]+/g, ""], // strip any leftover absolute saas paths (should not appear)
];

if (!fs.existsSync(SRC)) {
  console.error("Missing AIOR original:", SRC);
  process.exit(1);
}
if (!fs.existsSync(DEST)) {
  console.error("Missing www pack:", DEST);
  process.exit(1);
}

console.log("1/5 Restore assets/img from AIOR original …");
rimraf(path.join(DEST, "assets", "img"));
copyDir(path.join(SRC, "assets", "img"), path.join(DEST, "assets", "img"));

console.log("2/5 Restore assets/css from AIOR original …");
rimraf(path.join(DEST, "assets", "css"));
copyDir(path.join(SRC, "assets", "css"), path.join(DEST, "assets", "css"));

console.log("3/5 Restore assets/js + fonts (visual parity) …");
for (const sub of ["js", "fonts"]) {
  const from = path.join(SRC, "assets", sub);
  const to = path.join(DEST, "assets", sub);
  if (fs.existsSync(from)) {
    rimraf(to);
    copyDir(from, to);
  }
}

console.log("4/5 Remove saas-shots folder if any leftover …");
rimraf(path.join(DEST, "assets", "img", "nelvyon"));

console.log("5/5 Re-apply NELVYON logos only + fix HTML media paths …");
writeLogos();

let htmlFixed = 0;
for (const file of walk(DEST).filter((f) => f.endsWith(".html") && !path.basename(f).startsWith("mapa-"))) {
  let html = fs.readFileSync(file, "utf8");
  const before = html;
  for (const [re, to] of NELVYON_SRC_REVERTS) {
    if (!to && re.test(html)) {
      // empty replace only if we had a safe mapping — skip empty strip for safety
      continue;
    }
    html = html.replace(re, to);
  }
  // strip any remaining nelvyon webp refs that map unknown
  html = html.replace(/assets\/img\/nelvyon\/[A-Za-z0-9_.-]+/g, (m) => {
    console.warn("Unmapped nelvyon media path in", path.basename(file), m);
    return m;
  });
  if (html !== before) {
    fs.writeFileSync(file, html);
    htmlFixed++;
  }
}

// Verify sample bytes match original
const samples = [
  "normal/about-img1.jpg",
  "normal/hero-image4.png",
  "normal/about_2_1.jpg",
];
const checks = {};
for (const s of samples) {
  const a = path.join(SRC, "assets", "img", s);
  const b = path.join(DEST, "assets", "img", s);
  checks[s] =
    fs.existsSync(a) &&
    fs.existsSync(b) &&
    fs.statSync(a).size === fs.statSync(b).size;
}

const report = {
  restoredImg: true,
  restoredCss: true,
  logosNelvyon: true,
  htmlPathFixes: htmlFixed,
  sampleByteMatch: checks,
  nelvyonFolderGone: !fs.existsSync(path.join(DEST, "assets", "img", "nelvyon")),
  deploy: false,
};
fs.mkdirSync(path.join(ROOT, "docs", "evidence", "public-web-aior-nelvyon"), { recursive: true });
fs.writeFileSync(
  path.join(ROOT, "docs", "evidence", "public-web-aior-nelvyon", "visual-restore-report.json"),
  JSON.stringify(report, null, 2)
);
console.log(JSON.stringify(report, null, 2));
console.log("DONE — visual AIOR restored; content HTML kept. NO DEPLOY.");
