#!/usr/bin/env node
/**
 * Fail fast if apps/web/.next is not a usable production build.
 * Detects the corruption that causes webpack-runtime `reading 'call'` 500s:
 * empty static/ and/or build-manifest pointing at static/development.
 *
 * Usage: node scripts/assert-next-prod-artifacts.mjs
 */
import fs from "node:fs";
import path from "node:path";

const root = path.join(process.cwd(), "apps/web/.next");
const manifestPath = path.join(root, "build-manifest.json");
const staticDir = path.join(root, "static");

function fail(msg) {
  console.error(`[assert-next-prod] FAIL: ${msg}`);
  process.exit(1);
}

if (!fs.existsSync(root)) fail("missing apps/web/.next — run pnpm -C apps/web build");
if (!fs.existsSync(manifestPath)) fail("missing build-manifest.json");
if (!fs.existsSync(staticDir)) fail("missing .next/static");

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const blob = JSON.stringify(manifest);
if (blob.includes("static/development")) {
  fail("build-manifest references static/development (dev tree mixed into prod .next)");
}

const staticFiles = [];
const walk = (dir) => {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p);
    else staticFiles.push(p);
  }
};
walk(staticDir);

if (staticFiles.length < 10) {
  fail(`.next/static is empty or nearly empty (${staticFiles.length} files)`);
}

const rootMain = Array.isArray(manifest.rootMainFiles) ? manifest.rootMainFiles : [];
if (!rootMain.some((f) => /main-app-/.test(f) || /main-app\.js$/.test(f))) {
  // hashed main-app-*.js expected in prod; bare main-app.js is often a broken/dev mix
  if (rootMain.some((f) => f.includes("main-app.js") && !f.includes("main-app-"))) {
    fail("build-manifest rootMainFiles looks like a development build");
  }
}

console.log(
  `[assert-next-prod] PASS staticFiles=${staticFiles.length} rootMain=${rootMain.length}`,
);
