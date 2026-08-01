#!/usr/bin/env node
/**
 * Static certification helpers for NELVYON public web.
 * - Route inventory
 * - Demo/third-party branding scan
 * - Internal href existence
 * - Brand image existence
 */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const web = path.join(root, "apps/web");
const outDir = path.join(root, "docs/evidence");
fs.mkdirSync(outDir, { recursive: true });

const ROUTES = [
  "/",
  "/plataforma",
  "/agencia",
  "/automatizaciones-ia",
  "/soluciones",
  "/servicios",
  "/sectores",
  "/enterprise",
  "/integraciones",
  "/precios",
  "/casos-de-exito",
  "/recursos",
  "/blog",
  "/faq",
  "/contacto",
  "/login",
  "/saas",
  "/aviso-legal",
  "/privacidad",
  "/cookies",
  "/terminos",
  "/seguridad",
  "/status",
  "/legal",
  "/legal/dpa",
  "/legal/subprocessors",
];

function pageFile(route) {
  if (route === "/") return path.join(web, "src/app/(marketing)/page.tsx");
  if (route === "/login") return path.join(web, "src/app/login/page.tsx");
  if (["/privacidad", "/cookies", "/terminos"].includes(route)) {
    return path.join(web, `src/app${route}/page.tsx`);
  }
  if (route.startsWith("/legal")) return path.join(web, `src/app${route}/page.tsx`);
  return path.join(web, `src/app/(marketing)${route}/page.tsx`);
}

const routePresence = ROUTES.map((r) => ({
  route: r,
  file: path.relative(root, pageFile(r)).replaceAll("\\", "/"),
  exists: fs.existsSync(pageFile(r)),
}));

const scanDirs = [
  path.join(web, "src/features/public-web"),
  path.join(web, "src/app/(marketing)"),
  path.join(web, "src/app/privacidad"),
  path.join(web, "src/app/cookies"),
  path.join(web, "src/app/terminos"),
  path.join(web, "src/app/legal"),
];

const banned = [
  /lorem\s+ipsum/i,
  /\bSofax\b/,
  /\bNivia\b/,
  /\bEnvato\b/,
  /\bThemeForest\b/,
  /\bagenforce\b/i,
  /\bAcme\b/,
  /Your Company/i,
  /dummy text/i,
  /coming soon/i,
  /pr[oó]ximamente/i,
];

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, acc);
    else if (/\.(tsx?|mdx?|css)$/.test(ent.name)) acc.push(p);
  }
  return acc;
}

const brandingHits = [];
for (const dir of scanDirs) {
  for (const file of walk(dir)) {
    const text = fs.readFileSync(file, "utf8");
    for (const re of banned) {
      const m = text.match(re);
      if (m) {
        brandingHits.push({
          file: path.relative(root, file).replaceAll("\\", "/"),
          match: m[0],
        });
      }
    }
  }
}

const knownOk = new Set([
  "/register",
  "/login",
  "/packs",
  "/demo",
  "/partners",
  "/status",
  "/legal/refund-policy",
  "/legal/acceptable-use",
  "/legal/ai-disclosure",
  "/blog",
  "/contacto",
  "/precios",
  "/plataforma",
  "/agencia",
  "/automatizaciones-ia",
  "/soluciones",
  "/servicios",
  "/sectores",
  "/enterprise",
  "/integraciones",
  "/casos-de-exito",
  "/recursos",
  "/faq",
  "/saas",
  "/aviso-legal",
  "/privacidad",
  "/cookies",
  "/terminos",
  "/seguridad",
  "/legal",
  "/legal/dpa",
  "/legal/subprocessors",
  "/nosotros",
  "/",
]);

const hrefRe = /href=["'](\/[^"'#?]+)["']/g;
const srcRe = /(?:src|imageSrc)=["'](\/brand\/public\/[^"']+)["']/g;
const hrefs = new Set();
const imgs = new Set();
for (const dir of scanDirs) {
  for (const file of walk(dir)) {
    const text = fs.readFileSync(file, "utf8");
    let m;
    while ((m = hrefRe.exec(text))) hrefs.add(m[1]);
    while ((m = srcRe.exec(text))) imgs.add(m[1]);
  }
}

function routeExists(pathname) {
  if (knownOk.has(pathname)) return true;
  if (pathname.startsWith("/blog/")) return true;
  if (pathname.startsWith("/servicios/")) return true;
  return fs.existsSync(pageFile(pathname));
}

const badHrefs = [...hrefs].filter((h) => !routeExists(h)).sort();
const imgChecks = [...imgs].map((src) => ({
  src,
  exists: fs.existsSync(path.join(web, "public", src.replace(/^\//, ""))),
}));

const report = {
  generatedAt: new Date().toISOString(),
  routes: {
    total: ROUTES.length,
    missing: routePresence.filter((r) => !r.exists),
    all: routePresence,
  },
  brandingHits,
  hrefs: { total: hrefs.size, bad: badHrefs },
  images: {
    total: imgChecks.length,
    missing: imgChecks.filter((i) => !i.exists),
    all: imgChecks,
  },
  verdict:
    routePresence.every((r) => r.exists) &&
    brandingHits.length === 0 &&
    badHrefs.length === 0 &&
    imgChecks.every((i) => i.exists)
      ? "PASS"
      : "FAIL",
};

const out = path.join(outDir, "public-web-cert-static.json");
fs.writeFileSync(out, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ out, verdict: report.verdict, missingRoutes: report.routes.missing.length, brandingHits: brandingHits.length, badHrefs: badHrefs.length, missingImages: report.images.missing.length }, null, 2));
if (brandingHits.length) console.log("BRANDING", brandingHits.slice(0, 20));
if (badHrefs.length) console.log("BAD_HREFS", badHrefs);
if (report.images.missing.length) console.log("MISSING_IMG", report.images.missing);
