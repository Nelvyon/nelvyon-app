/**
 * Copia public/ y .next/static al bundle standalone (requerido en monorepo Railway).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(scriptsDir, "..");
const standaloneApp = path.join(webRoot, ".next/standalone/apps/web");

if (!fs.existsSync(standaloneApp)) {
  console.error(
    "[copy-standalone-assets] Missing",
    standaloneApp,
    "— run next build with output: standalone first.",
  );
  process.exit(1);
}

const publicSrc = path.join(webRoot, "public");
const publicDest = path.join(standaloneApp, "public");
if (fs.existsSync(publicSrc)) {
  fs.cpSync(publicSrc, publicDest, { recursive: true });
  console.log("[copy-standalone-assets] public → standalone");
}

const staticSrc = path.join(webRoot, ".next/static");
const staticDest = path.join(standaloneApp, ".next/static");
if (fs.existsSync(staticSrc)) {
  fs.mkdirSync(path.dirname(staticDest), { recursive: true });
  fs.cpSync(staticSrc, staticDest, { recursive: true });
  console.log("[copy-standalone-assets] .next/static → standalone");
}

console.log("[copy-standalone-assets] done");
