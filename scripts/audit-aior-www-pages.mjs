/**
 * Auditoría página-a-página del pack /www (36 páginas).
 * Solo lectura + informe. No toca HTML/CSS/JS de layout.
 *
 *   node scripts/audit-aior-www-pages.mjs
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const WWW = path.join(ROOT, "apps", "web", "public", "www");
const EVIDENCE = path.join(ROOT, "docs", "evidence", "public-web-aior-nelvyon");

const PAGES = fs
  .readdirSync(WWW)
  .filter((f) => f.endsWith(".html") && f !== "mapa-plantillas.html")
  .sort();

const FORBIDDEN =
  /\bAIOR\b|Aiorchat|Aiorbot|themehour|themeforest|mail\.php|lorem ipsum|Zipchat|Planora|John Peter|John Carter|Cassie Adams|Gali Chat|Bitcoin|Ethereum|crypto wallet/i;

function resolveAsset(pageFile, ref) {
  if (!ref || /^(https?:|data:|mailto:|tel:|#|javascript:)/i.test(ref)) return { ok: true, external: true };
  const clean = ref.split("?")[0].split("#")[0];
  if (!clean) return { ok: true, empty: true };
  const abs = path.normalize(path.join(path.dirname(pageFile), clean));
  return { ok: fs.existsSync(abs), abs, ref: clean };
}

const perPage = [];
let totalBrokenImg = 0;
let totalBrokenLink = 0;
let totalForbidden = 0;

for (const file of PAGES) {
  const abs = path.join(WWW, file);
  const html = fs.readFileSync(abs, "utf8");
  const imgs = [...html.matchAll(/\b(?:src|data-bg-src|data-bg|data-src)=["']([^"']+)["']/gi)].map((m) => m[1]);
  const hrefs = [...html.matchAll(/\bhref=["']([^"']+)["']/gi)].map((m) => m[1]);

  const brokenImages = [];
  for (const src of imgs) {
    const r = resolveAsset(abs, src);
    if (!r.external && !r.empty && !r.ok) brokenImages.push(src);
  }

  const brokenLinks = [];
  for (const href of hrefs) {
    if (!href.endsWith(".html") && !href.includes(".html#")) continue;
    const r = resolveAsset(abs, href.replace(/#.*$/, ""));
    if (!r.external && !r.empty && !r.ok) brokenLinks.push(href);
  }

  const forbid = FORBIDDEN.test(html.replace(/<script[\s\S]*?<\/script>/gi, ""));
  if (forbid) totalForbidden++;
  totalBrokenImg += brokenImages.length;
  totalBrokenLink += brokenLinks.length;

  perPage.push({
    page: file,
    images: imgs.length,
    brokenImages: [...new Set(brokenImages)],
    internalHtmlLinks: hrefs.filter((h) => h.includes(".html")).length,
    brokenInternalHtmlLinks: [...new Set(brokenLinks)],
    hasNoindex: /robots" content="noindex/i.test(html),
    hasCanonical: /rel="canonical"/i.test(html),
    hasViewport: /name="viewport"/i.test(html),
    forbiddenHit: forbid,
    ok: brokenImages.length === 0 && brokenLinks.length === 0 && !forbid,
  });
}

const report = {
  generatedAt: new Date().toISOString(),
  pagesReviewed: PAGES.length,
  pagesOk: perPage.filter((p) => p.ok).length,
  totalBrokenImages: totalBrokenImg,
  totalBrokenInternalHtmlLinks: totalBrokenLink,
  totalForbiddenHits: totalForbidden,
  ok: totalBrokenImg === 0 && totalBrokenLink === 0 && totalForbidden === 0,
  perPage,
};

fs.mkdirSync(EVIDENCE, { recursive: true });
const out = path.join(EVIDENCE, "page-by-page-audit.json");
fs.writeFileSync(out, JSON.stringify(report, null, 2));
console.log(
  JSON.stringify(
    {
      ok: report.ok,
      pagesReviewed: report.pagesReviewed,
      pagesOk: report.pagesOk,
      brokenImages: report.totalBrokenImages,
      brokenLinks: report.totalBrokenInternalHtmlLinks,
      forbidden: report.totalForbiddenHits,
      failed: perPage.filter((p) => !p.ok).map((p) => p.page),
    },
    null,
    2
  )
);
