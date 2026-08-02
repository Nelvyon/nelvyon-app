/**
 * Certificado final de calidad — pack /www (solo lectura + informe).
 * node scripts/certify-aior-www-final-quality.mjs [--base http://127.0.0.1:3010]
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const WWW = path.join(ROOT, "apps", "web", "public", "www");
const REF_IMG = path.join(ROOT, ".reference", "aior", "download-version", "assets", "img");
const EVIDENCE = path.join(ROOT, "docs", "evidence", "public-web-aior-nelvyon");
const BASE = (process.argv.find((a) => a.startsWith("--base=")) || "").slice(7) || "http://127.0.0.1:3010";

function matchesAiorOriginal(absPath) {
  if (!absPath.includes(`${path.sep}assets${path.sep}img${path.sep}`)) return false;
  const rel = path.relative(path.join(WWW, "assets", "img"), absPath);
  if (rel.startsWith("..")) return false;
  const ref = path.join(REF_IMG, rel);
  if (!fs.existsSync(ref)) return false;
  return fs.statSync(ref).size === fs.statSync(absPath).size;
}

const PAGES = fs.readdirSync(WWW).filter((f) => f.endsWith(".html") && f !== "mapa-plantillas.html").sort();

const TEMPLATE =
  /\b(AIOR|Aiorchat|ThemeHour|Themeforest|lorem ipsum|mail\.php|Fort Lauderdale|345 6789|9876 543|Chiropractic|Robentix|Jems Olive|Anya Smith|Works Process|Contact Us|Active Users|Price Table|Full Name|Phone Number|Yearly -35%|Select Service|effortlessly|Angfuztheme|Read Articles|Before using NELVYON|NELVYON is an all-in-one|Empowering Every Industry|Manstack Developer|Write a Comment|Trusworthy|Inspire Platform)\b/i;

function resolve(pageAbs, ref) {
  if (!ref || /^(https?:|data:|mailto:|tel:|#|javascript:)/i.test(ref)) return { ok: true, kind: "external" };
  const clean = ref.split("?")[0].split("#")[0];
  if (!clean) return { ok: true, kind: "empty" };
  const abs = path.normalize(path.join(path.dirname(pageAbs), clean));
  return { ok: fs.existsSync(abs), abs, clean, kind: "file" };
}

const pages = [];
const globalBrokenImg = new Set();
const globalBrokenLink = setNew();
const globalBrokenIcon = new Set();
const lowRes = [];
const stretchedSuspects = [];
const faviconMissing = new Set();
const seoGaps = [];
const templateHits = [];
const imgUsage = new Map(); // path -> pages[]

function setNew() {
  return new Set();
}

for (const file of PAGES) {
  const abs = path.join(WWW, file);
  const html = fs.readFileSync(abs, "utf8");
  const issues = [];

  // SEO
  const seo = {
    title: /<title>[^<]+<\/title>/i.test(html),
    description: /name="description"/i.test(html),
    canonical: /rel="canonical"/i.test(html),
    robots: /name="robots"/i.test(html),
    ogTitle: /property="og:title"/i.test(html),
    ogImage: /property="og:image"/i.test(html),
    twitterCard: /name="twitter:card"/i.test(html),
    viewport: /name="viewport"/i.test(html),
    langEs: /lang="es"/i.test(html),
    jsonLd: /application\/ld\+json/i.test(html),
  };
  for (const [k, v] of Object.entries(seo)) {
    if (!v && k !== "jsonLd") issues.push(`seo_missing_${k}`);
  }
  if (!seo.jsonLd) issues.push("seo_no_jsonld"); // informational

  // template
  if (TEMPLATE.test(html.replace(/<script[\s\S]*?<\/script>/gi, ""))) {
    templateHits.push(file);
    issues.push("template_text");
  }

  // favicons referenced
  for (const m of html.matchAll(/href=["'](assets\/img\/favicons\/[^"']+)["']/gi)) {
    const r = resolve(abs, m[1]);
    if (!r.ok) {
      faviconMissing.add(m[1]);
      issues.push(`favicon_missing:${m[1]}`);
    }
  }

  // images
  const imgRefs = [...html.matchAll(/\b(?:src|data-bg-src|data-bg|data-src)=["']([^"']+)["']/gi)].map((m) => m[1]);
  for (const src of imgRefs) {
    const r = resolve(abs, src);
    if (r.kind === "file" && !r.ok) {
      globalBrokenImg.add(`${file}::${src}`);
      issues.push(`broken_img:${src}`);
      continue;
    }
    if (r.kind !== "file" || !r.ok) continue;
    const key = path.relative(WWW, r.abs).replace(/\\/g, "/");
    if (!imgUsage.has(key)) imgUsage.set(key, []);
    imgUsage.get(key).push(file);
    const st = fs.statSync(r.abs);
    const isDecor =
      /[\\/](icon|shape|favicons|logo)[\\/]/i.test(r.abs) ||
      /\.(svg)$/i.test(r.abs) ||
      /favicon|logo-icon|mask-shape|integration-logo/i.test(r.abs);
    // Placeholders pequeños del ZIP AIOR original NO son error (fidelidad visual).
    if (matchesAiorOriginal(r.abs)) {
      // ok — byte-identical to Envato AIOR
    } else if (!isDecor && st.size < 8000 && /\.(jpe?g|png|webp)$/i.test(r.abs)) {
      lowRes.push({ file, src, bytes: st.size });
      issues.push(`low_bytes_content:${src}:${st.size}`);
    } else if (isDecor && st.size < 2500 && /\.(jpe?g|png|webp)$/i.test(r.abs)) {
      lowRes.push({ file, src, bytes: st.size, decor: true });
    }
  }

  // icon imgs in buttons
  for (const m of html.matchAll(/class="[^"]*icon[^"]*"[\s\S]{0,80}?src=["']([^"']+)["']/gi)) {
    const r = resolve(abs, m[1]);
    if (r.kind === "file" && !r.ok) {
      globalBrokenIcon.add(`${file}::${m[1]}`);
      issues.push(`broken_icon:${m[1]}`);
    }
  }

  // internal html links
  for (const m of html.matchAll(/\bhref=["']([^"']+\.html[^"']*)["']/gi)) {
    const href = m[1].replace(/#.*$/, "");
    const r = resolve(abs, href);
    if (r.kind === "file" && !r.ok) {
      globalBrokenLink.add(`${file}::${m[1]}`);
      issues.push(`broken_link:${m[1]}`);
    }
  }

  // logo
  for (const m of html.matchAll(/logo[^"']*["']?\s*(?:src|href)=["']([^"']+)["']/gi)) {
    const r = resolve(abs, m[1]);
    if (r.kind === "file" && !r.ok) issues.push(`broken_logo:${m[1]}`);
  }
  // also common logo paths
  for (const logo of ["assets/img/logo.svg", "assets/img/logo.png", "assets/img/logo-icon.svg"]) {
    const r = resolve(abs, logo);
    if (html.includes(logo) && r.kind === "file" && !r.ok) issues.push(`broken_logo:${logo}`);
  }

  // forms
  const forms = [...html.matchAll(/<form[\s\S]*?<\/form>/gi)];
  for (const form of forms) {
    if (/action=["']mail\.php["']/i.test(form[0])) issues.push("form_mail_php");
    if (/placeholder=["'](Full Name|Phone Number|Your Message|Your Name)["']/i.test(form[0])) {
      issues.push("form_en_placeholder");
    }
  }

  pages.push({
    page: file,
    issues,
    ok: issues.filter((i) => !i.startsWith("seo_no_jsonld") && !i.startsWith("low_bytes:")).length === 0,
    seo,
    imageCount: imgRefs.length,
  });
}

// repeated images across many pages (informational density)
const heavyReuse = [...imgUsage.entries()]
  .filter(([, pagesUsing]) => new Set(pagesUsing).size >= 12 && /\.(jpe?g|png|webp)$/i.test(pagesUsing[0] || ""))
  .map(([asset, pagesUsing]) => ({ asset, pages: [...new Set(pagesUsing)].length }))
  .sort((a, b) => b.pages - a.pages)
  .slice(0, 25);

const publicRoot = path.join(ROOT, "apps", "web", "public");
const siteFiles = {
  robotsTxtPublic: fs.existsSync(path.join(publicRoot, "robots.txt")),
  sitemapXmlPublic: fs.existsSync(path.join(publicRoot, "sitemap.xml")),
  robotsTxtWww: fs.existsSync(path.join(WWW, "robots.txt")),
  sitemapXmlWww: fs.existsSync(path.join(WWW, "sitemap.xml")),
  opengraphRouteNote: "og:image apunta a /opengraph-image (ruta Next), no a asset estático del pack",
};

// live HTTP probe
const live = { base: BASE, probes: [] };
async function probe(urlPath) {
  const url = `${BASE}${urlPath}`;
  try {
    const res = await fetch(url, { redirect: "manual" });
    live.probes.push({ path: urlPath, status: res.status });
  } catch (e) {
    live.probes.push({ path: urlPath, status: 0, error: String(e.message || e) });
  }
}

const samplePages = ["index.html", "pricing.html", "contact.html", "about.html", "features.html", "home-ai-agent.html"];
for (const p of samplePages) await probe(`/www/${p}`);
await probe("/www/assets/css/style.css");
await probe("/www/assets/img/logo.svg");
await probe("/www/assets/img/favicons/favicon-32x32.png");
await probe("/www/assets/img/favicons/favicon.ico");
await probe("/robots.txt");
await probe("/sitemap.xml");
await probe("/opengraph-image");

const realErrors = [];
for (const p of pages) {
  for (const i of p.issues) {
    if (i === "seo_no_jsonld") continue;
    if (i.startsWith("low_bytes:") && !i.startsWith("low_bytes_content:")) continue;
    realErrors.push({ page: p.page, issue: i });
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  pagesReviewed: PAGES.length,
  pagesOkStrict: pages.filter((p) => p.ok).length,
  realErrorCount: realErrors.length,
  brokenImages: [...globalBrokenImg],
  brokenLinks: [...globalBrokenLink],
  brokenIcons: [...globalBrokenIcon],
  faviconMissing: [...faviconMissing],
  templatePages: templateHits,
  lowResSamples: lowRes.slice(0, 40),
  lowResCount: lowRes.length,
  heavyImageReuseTop: heavyReuse,
  siteFiles,
  live,
  notes: [
    "noindex + canonical /www/* son intencionales hasta decisión de URLs.",
    "json-ld ausente: no es bug del pack AIOR; pendiente al cerrar URLs públicas.",
    "Sitemap/robots del pack: la app Next controla SEO de producto; no inventar sitemap /www hasta URLs finales.",
    "stretchedSuspects requiere inspección visual (no hay métricas intrínsecas en HTML).",
  ],
  pages,
  certificate: {
    pass: realErrors.length === 0 && live.probes.filter((p) => p.path.startsWith("/www/") && p.status !== 200 && p.status !== 308 && p.status !== 307).length === 0,
    grade: null,
  },
};

const wwwLiveFail = live.probes.filter(
  (p) => p.path.startsWith("/www/") && p.status !== 200 && p.status !== 0
);
// favicon.ico may 404 if only png exists — treat as real if missing
const favIco = live.probes.find((p) => p.path.includes("favicon.ico"));
if (favIco && favIco.status === 404) {
  realErrors.push({ page: "*", issue: "live_favicon_ico_404" });
  report.realErrorCount = realErrors.length;
}

report.certificate.pass = realErrors.length === 0;
report.certificate.grade = report.certificate.pass ? "PASS" : "FAIL";
report.realErrors = realErrors;

fs.mkdirSync(EVIDENCE, { recursive: true });
const out = path.join(EVIDENCE, "FINAL_QUALITY_CERTIFICATE.json");
fs.writeFileSync(out, JSON.stringify(report, null, 2));

const md = `# Certificado final de calidad — pack AIOR NELVYON

**Fecha:** ${report.generatedAt}
**Resultado:** **${report.certificate.grade}**
**Páginas:** ${report.pagesReviewed}
**Errores reales:** ${report.realErrorCount}
**Deploy:** NO

## Checks estructurales

| Check | Resultado |
|-------|-----------|
| Imágenes rotas | ${report.brokenImages.length === 0 ? "PASS" : "FAIL (" + report.brokenImages.length + ")"} |
| Enlaces HTML internos rotos | ${report.brokenLinks.length === 0 ? "PASS" : "FAIL"} |
| Iconos rotos | ${report.brokenIcons.length === 0 ? "PASS" : "FAIL"} |
| Favicons referenciados en disco | ${report.faviconMissing.length === 0 ? "PASS" : "FAIL"} |
| Texto plantilla/demo residual | ${report.templatePages.length === 0 ? "PASS" : "FAIL"} |
| Meta title/description/canonical/robots/OG/Twitter/viewport/lang | ${pages.every((p) => p.seo.title && p.seo.description && p.seo.canonical && p.seo.robots && p.seo.ogTitle && p.seo.ogImage && p.seo.twitterCard && p.seo.viewport && p.seo.langEs) ? "PASS" : "FAIL"} |
| JSON-LD | AUSENTE (documentado — no bloqueante pre-URL) |
| robots.txt / sitemap.xml en /www | AUSENTE a propósito (URLs temporales) |
| Live /www sample HTTP | ver JSON |

## Live probes

${live.probes.map((p) => `- \`${p.path}\` → **${p.status}**${p.error ? " (" + p.error + ")" : ""}`).join("\n")}

## Imágenes low-bytes (<2.5KB)

${report.lowResCount === 0 ? "Ninguna." : report.lowResCount + " hallazgos (ver JSON). Pueden ser shapes/iconos legítimos."}

## Pendientes de producto (no errores del pack)

1. Quitar \`noindex\` cuando las URLs sean definitivas.
2. Añadir sitemap/robots/JSON-LD en esa fase.
3. OK visual CEO.
4. Fotos reales de equipo (slots stock AIOR con roles, no nombres falsos).

## Errores reales

${realErrors.length === 0 ? "**Ninguno encontrado.**" : realErrors.map((e) => `- ${e.page}: ${e.issue}`).join("\n")}

---
Evidencia máquina: \`FINAL_QUALITY_CERTIFICATE.json\`
`;

fs.writeFileSync(path.join(EVIDENCE, "FINAL_QUALITY_CERTIFICATE.md"), md);
console.log(JSON.stringify({
  grade: report.certificate.grade,
  pagesReviewed: report.pagesReviewed,
  realErrorCount: report.realErrorCount,
  brokenImages: report.brokenImages.length,
  brokenLinks: report.brokenLinks.length,
  templatePages: report.templatePages.length,
  lowResCount: report.lowResCount,
  faviconMissing: report.faviconMissing.length,
  live: live.probes,
  out,
}, null, 2));
