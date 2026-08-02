#!/usr/bin/env node
/**
 * Lighthouse against local prod server. Tolerates Windows EPERM on chrome.kill().
 * Resolves packages from pnpm dlx store when not installed in the workspace.
 */
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const base = (process.argv.includes("--base")
  ? process.argv[process.argv.indexOf("--base") + 1]
  : "http://127.0.0.1:3010"
).replace(/\/$/, "");

const routes = [
  { id: "home", path: "/" },
  { id: "precios", path: "/precios" },
  { id: "contacto", path: "/contacto" },
  { id: "producto", path: "/producto" },
];

function findStorePkg(name) {
  const links = path.join(
    process.env.LOCALAPPDATA || "",
    "pnpm",
    "store",
    "v11",
    "links",
    "@",
    name,
  );
  if (!fs.existsSync(links)) return null;
  const vers = fs.readdirSync(links).sort().reverse();
  for (const ver of vers) {
    const verDir = path.join(links, ver);
    const hashes = fs.readdirSync(verDir);
    for (const hash of hashes) {
      const pkg = path.join(verDir, hash, "node_modules", name);
      if (fs.existsSync(path.join(pkg, "package.json"))) return pkg;
    }
  }
  return null;
}

const lhPkg = findStorePkg("lighthouse");
const clPkg = findStorePkg("chrome-launcher");
if (!lhPkg || !clPkg) {
  console.error("[lh] Missing pnpm store packages. Run once: pnpm dlx lighthouse@13.4.1 --version");
  process.exit(2);
}

const chromePath =
  process.env.CHROME_PATH ||
  [
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  ].find((p) => fs.existsSync(p));

if (!chromePath) {
  console.error("[lh] Edge/Chrome not found");
  process.exit(1);
}

const tmp = path.join(process.cwd(), ".tmp", "lh-prog");
fs.mkdirSync(tmp, { recursive: true });
process.env.TEMP = tmp;
process.env.TMP = tmp;

const lighthouse = (await import(pathToFileURL(path.join(lhPkg, "core/index.js")).href)).default;
const chromeLauncher = await import(pathToFileURL(path.join(clPkg, "dist/chrome-launcher.js")).href);

const outDir = path.join(process.cwd(), "docs/evidence/public-web-lighthouse");
fs.mkdirSync(outDir, { recursive: true });

const summary = [];
for (const route of routes) {
  const userDataDir = path.join(tmp, `profile-${route.id}`);
  fs.rmSync(userDataDir, { recursive: true, force: true });
  fs.mkdirSync(userDataDir, { recursive: true });
  process.stdout.write(`[lh] ${route.id} ... `);
  const chrome = await chromeLauncher.launch({
    chromePath,
    chromeFlags: ["--headless=new", "--no-sandbox", "--disable-gpu"],
    userDataDir,
  });
  try {
    const result = await lighthouse(`${base}${route.path}`, {
      port: chrome.port,
      output: "json",
      logLevel: "error",
      onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
      formFactor: "desktop",
      screenEmulation: {
        mobile: false,
        width: 1350,
        height: 940,
        deviceScaleFactor: 1,
        disabled: false,
      },
    });
    fs.writeFileSync(path.join(outDir, `${route.id}.json`), result.report);
    const c = result.lhr.categories;
    const row = {
      id: route.id,
      url: `${base}${route.path}`,
      performance: Math.round(100 * (c.performance?.score ?? 0)),
      accessibility: Math.round(100 * (c.accessibility?.score ?? 0)),
      bestPractices: Math.round(100 * (c["best-practices"]?.score ?? 0)),
      seo: Math.round(100 * (c.seo?.score ?? 0)),
    };
    summary.push(row);
    console.log(`perf=${row.performance} a11y=${row.accessibility} bp=${row.bestPractices} seo=${row.seo}`);
  } finally {
    try {
      await chrome.kill();
    } catch (e) {
      console.warn(`[lh] kill ignored: ${e instanceof Error ? e.message : e}`);
    }
  }
}

fs.writeFileSync(path.join(outDir, "summary.json"), JSON.stringify(summary, null, 2));
console.log(`[lh] PASS wrote summary (${summary.length} routes)`);
