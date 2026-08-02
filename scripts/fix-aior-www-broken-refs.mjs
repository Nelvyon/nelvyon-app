/**
 * Arregla solo refs rotas en /www (links + assets), sin tocar layout/CSS/JS.
 *   node scripts/fix-aior-www-broken-refs.mjs
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const WWW = path.join(ROOT, "apps", "web", "public", "www");
const IMG = path.join(WWW, "assets", "img");

// 1) Video brand rename: HTML pide nelvyon.mp4 pero el fichero es aior.mp4
const bg = path.join(IMG, "bg");
const aiorMp4 = path.join(bg, "aior.mp4");
const nelvyonMp4 = path.join(bg, "nelvyon.mp4");
if (fs.existsSync(aiorMp4) && !fs.existsSync(nelvyonMp4)) {
  fs.copyFileSync(aiorMp4, nelvyonMp4);
  console.log("Copied bg/aior.mp4 → bg/nelvyon.mp4");
}

// 2) Thumb megamenú inexistente → alias a finance-crypto thumb (solo asset, HTML intacto en path name)
const pages = path.join(IMG, "pages");
const digital = path.join(pages, "home-finance-digital-service.jpg");
const cryptoThumb = path.join(pages, "home-finance-crypto-service.jpg");
const cloudThumb = path.join(pages, "home-cloud-based-saas.jpg");
if (!fs.existsSync(digital)) {
  const src = fs.existsSync(cloudThumb) ? cloudThumb : cryptoThumb;
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, digital);
    console.log("Created pages/home-finance-digital-service.jpg from", path.basename(src));
  }
}

// 3) Icono file.svg faltante
const fileSvg = path.join(IMG, "icon", "file.svg");
if (!fs.existsSync(fileSvg)) {
  fs.mkdirSync(path.dirname(fileSvg), { recursive: true });
  fs.writeFileSync(
    fileSvg,
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#0084ff" stroke-width="1.5"><path d="M6 2h8l4 4v16H6z"/><path d="M14 2v4h4"/></svg>\n`
  );
  console.log("Wrote icon/file.svg");
}

// 4) Links a páginas AIOR inexistentes → internas NELVYON
const LINK_FIXES = [
  [/href="course\.html"/g, 'href="features.html"'],
  [/href="doctor-details\.html"/g, 'href="contact.html"'],
  [/href='course\.html'/g, "href='features.html'"],
  [/href='doctor-details\.html'/g, "href='contact.html'"],
];

let filesChanged = 0;
for (const f of fs.readdirSync(WWW).filter((x) => x.endsWith(".html"))) {
  const p = path.join(WWW, f);
  let html = fs.readFileSync(p, "utf8");
  const before = html;
  for (const [re, to] of LINK_FIXES) html = html.replace(re, to);
  // Mapa interno: no mencionar AIOR como marca de producto
  if (f === "mapa-plantillas.html") {
    html = html
      .replace(/plantillas AIOR/g, "plantillas conservadas")
      .replace(/mapa de plantillas AIOR/g, "mapa de plantillas NELVYON");
  }
  if (html !== before) {
    fs.writeFileSync(p, html);
    filesChanged++;
  }
}

console.log(JSON.stringify({ filesChanged, nelvyonMp4: fs.existsSync(nelvyonMp4), digitalThumb: fs.existsSync(digital), fileSvg: fs.existsSync(fileSvg) }, null, 2));
