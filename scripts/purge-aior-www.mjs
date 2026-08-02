#!/usr/bin/env node
/**
 * Elimina el dump HTML AIOR en apps/web/public/www/ (~140 MB).
 * La web canónica es Next + assets slim en public/brand/public/aior/.
 *
 * Uso: node scripts/purge-aior-www.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const target = path.join(root, "apps/web/public/www");

if (!fs.existsSync(target)) {
  console.log("OK: no existe apps/web/public/www/");
  process.exit(0);
}

fs.rmSync(target, { recursive: true, force: true });
console.log("Purgado:", target);
console.log("Mantener slim AIOR en apps/web/public/brand/public/aior/ y capturas saas-shots.");
