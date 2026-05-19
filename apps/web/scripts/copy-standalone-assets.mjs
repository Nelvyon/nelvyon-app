/**
 * Flatten monorepo standalone to apps/web/.next/standalone/server.js (Railway/Docker).
 * Copies public/ and .next/static into the bundle.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(scriptsDir, "..");
const standaloneRoot = path.join(webRoot, ".next/standalone");
const nestedApp = path.join(standaloneRoot, "apps/web");
const flatDest = path.join(webRoot, ".next/standalone-flat");

function copyRecursive(src, dest) {
  fs.cpSync(src, dest, { recursive: true });
}

if (!fs.existsSync(nestedApp)) {
  console.error(
    "[copy-standalone-assets] Missing",
    nestedApp,
    "— run next build with output: standalone first.",
  );
  process.exit(1);
}

console.log("[copy-standalone-assets] standaloneRoot contents:", fs.readdirSync(standaloneRoot));
if (fs.existsSync(path.join(standaloneRoot, "node_modules"))) {
  console.log(
    "[copy-standalone-assets] standaloneRoot/node_modules:",
    fs.readdirSync(path.join(standaloneRoot, "node_modules")).slice(0, 20),
  );
}

if (fs.existsSync(flatDest)) {
  fs.rmSync(flatDest, { recursive: true, force: true });
}
fs.mkdirSync(flatDest, { recursive: true });

// App entry (server.js, package.json, .next inside app, etc.)
copyRecursive(nestedApp, flatDest);

// Monorepo standalone ships shared node_modules at standalone root — merge (do not replace)
const sharedNodeModules = path.join(standaloneRoot, "node_modules");
if (fs.existsSync(sharedNodeModules)) {
  const destModules = path.join(flatDest, "node_modules");
  fs.mkdirSync(destModules, { recursive: true });
  copyRecursive(sharedNodeModules, destModules);
  console.log("[copy-standalone-assets] merged standaloneRoot/node_modules into flat bundle");
}

const publicSrc = path.join(webRoot, "public");
const publicDest = path.join(flatDest, "public");
if (fs.existsSync(publicSrc)) {
  copyRecursive(publicSrc, publicDest);
  console.log("[copy-standalone-assets] public → standalone");
}

const staticSrc = path.join(webRoot, ".next/static");
const staticDest = path.join(flatDest, ".next/static");
if (fs.existsSync(staticSrc)) {
  fs.mkdirSync(path.dirname(staticDest), { recursive: true });
  copyRecursive(staticSrc, staticDest);
  console.log("[copy-standalone-assets] .next/static → standalone");
}

const serverJs = path.join(flatDest, "server.js");
if (!fs.existsSync(serverJs)) {
  console.error("[copy-standalone-assets] Missing server.js in flattened bundle");
  process.exit(1);
}

// Verify next exists in flattened bundle
const nextInFlat = path.join(flatDest, "node_modules/next");
if (!fs.existsSync(nextInFlat)) {
  console.log("[copy-standalone-assets] next not found in flat node_modules, copying from nested standalone...");
  const nextInNested = path.join(standaloneRoot, "node_modules/next");
  const nextInWebModules = path.join(webRoot, "node_modules/next");

  if (fs.existsSync(nextInNested)) {
    fs.mkdirSync(path.join(flatDest, "node_modules"), { recursive: true });
    copyRecursive(nextInNested, nextInFlat);
    console.log("[copy-standalone-assets] copied next from nested standalone");
  } else if (fs.existsSync(nextInWebModules)) {
    fs.mkdirSync(path.join(flatDest, "node_modules"), { recursive: true });
    copyRecursive(nextInWebModules, nextInFlat);
    console.log("[copy-standalone-assets] copied next from apps/web/node_modules");
  } else {
    console.error("[copy-standalone-assets] FATAL: cannot find next package anywhere");
    process.exit(1);
  }
}

if (fs.existsSync(standaloneRoot)) {
  fs.rmSync(standaloneRoot, { recursive: true, force: true });
}
fs.renameSync(flatDest, standaloneRoot);

console.log("[copy-standalone-assets] flattened →", path.join(standaloneRoot, "server.js"));
if (fs.existsSync(path.join(standaloneRoot, "node_modules/next"))) {
  console.log("[copy-standalone-assets] verified node_modules/next in final bundle");
} else {
  console.error("[copy-standalone-assets] FATAL: node_modules/next missing after flatten");
  process.exit(1);
}
console.log("[copy-standalone-assets] done");
