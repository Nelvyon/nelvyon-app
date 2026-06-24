#!/usr/bin/env node
/**
 * check-saas-stubs.mjs
 * Falla si alguna ruta /api/saas/* es un stub vacío sin requireSaasContext.
 * Un stub vacío = devuelve solo {} o [] sin leer DB ni validar auth.
 *
 * Lógica: si el archivo NO contiene "requireSaasContext" Y contiene uno de los
 * patrones de stub vacío (json({}), json([]), json({ok:true}) como único cuerpo),
 * es un stub a eliminar.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("../apps/web/src/app/api/saas", import.meta.url).pathname
  .replace(/^\/([A-Z]:)/, "$1"); // Windows compat

const STUB_PATTERNS = [
  /NextResponse\.json\(\s*\{\s*\}\s*\)/,
  /NextResponse\.json\(\s*\[\s*\]\s*\)/,
  /NextResponse\.json\(\s*\{\s*ok:\s*true\s*\}\s*\)/,
  /NextResponse\.json\(\s*\{\s*success:\s*true\s*\}\s*\)/,
];

function walk(dir) {
  const results = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) results.push(...walk(full));
    else if (entry === "route.ts" || entry === "route.tsx") results.push(full);
  }
  return results;
}

let failed = 0;

for (const file of walk(ROOT)) {
  const content = readFileSync(file, "utf8");

  // Skip if it has real auth guard
  if (content.includes("requireSaasContext")) continue;
  // Skip if it has a 410 (intentional gone)
  if (content.includes("status: 410")) continue;
  // Skip health-like endpoints
  if (file.includes("/health")) continue;

  const isStub = STUB_PATTERNS.some((p) => p.test(content));
  if (isStub) {
    const rel = file.replace(/\\/g, "/").split("apps/web/src/app/api/saas/")[1];
    console.error(`❌ STUB sin auth: /api/saas/${rel}`);
    console.error(`   → Implementa lógica real con requireSaasContext, o devuelve 410 Gone`);
    failed++;
  }
}

if (failed > 0) {
  console.error(`\n${failed} stub(s) vacío(s) encontrado(s). Elimínalos antes de hacer push.`);
  process.exit(1);
}

console.log("✅ Anti-stub gate: 0 stubs vacíos sin auth encontrados");
