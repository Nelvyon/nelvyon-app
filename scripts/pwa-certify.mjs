#!/usr/bin/env node
/**
 * PWA certification — reads real manifest.json, manifest-saas.json, sw.js
 * from disk and writes evidence markdown.
 *
 * Mirrors the checks in `backend/agency/PwaCertification.ts` (kept in sync
 * manually — this runs as a standalone Node script with no TS transform, the
 * same pattern used by the other scripts/*.mjs certification scripts in this
 * repo, e.g. scripts/nelvyon-labs-master-closure.mjs).
 *
 * Usage: node scripts/pwa-certify.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = path.join(root, "apps/web/public");

const REQUIRED_FIELDS = ["name", "icons", "display", "start_url"];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function evaluateManifest(name, manifest, swSource) {
  const missingFields = REQUIRED_FIELDS.filter((field) => {
    const value = manifest[field];
    if (field === "icons") return !Array.isArray(value) || value.length === 0;
    return !value;
  });

  const icons = (manifest.icons ?? []).map((icon) => {
    const rel = icon.src.replace(/^\//, "");
    const abs = path.join(publicDir, rel);
    return { src: icon.src, existsOnDisk: fs.existsSync(abs) };
  });
  const missingIconFiles = icons.filter((icon) => !icon.existsOnDisk).map((icon) => icon.src);

  const offlineStrategyDocumented = /cache/i.test(swSource) && /offline/i.test(swSource);

  const violations = [
    ...missingFields.map((f) => `missing_field:${f}`),
    ...missingIconFiles.map((s) => `missing_icon_file:${s}`),
  ];
  if (!offlineStrategyDocumented) violations.push("offline_strategy_not_documented_in_sw");

  return {
    manifestName: name,
    ok: violations.length === 0,
    missingFields,
    icons,
    missingIconFiles,
    offlineStrategyDocumented,
    violations,
  };
}

const manifest = readJson(path.join(publicDir, "manifest.json"));
const manifestSaas = readJson(path.join(publicDir, "manifest-saas.json"));
const swSource = fs.readFileSync(path.join(publicDir, "sw.js"), "utf8");

const results = [
  evaluateManifest("manifest.json", manifest, swSource),
  evaluateManifest("manifest-saas.json", manifestSaas, swSource),
];

const overallOk = results.every((r) => r.ok);
const timestamp = new Date().toISOString();

const lines = [];
lines.push("# PWA certification");
lines.push("");
lines.push("| Campo | Valor |");
lines.push("|-------|-------|");
lines.push(`| Fecha | ${timestamp} |`);
lines.push(`| Resultado | ${overallOk ? "PASS" : "FAIL"} |`);
lines.push('| iOS Safari "Add to Home Screen" | PARTIAL — no verificado en dispositivo real en esta sesión |');
lines.push("");

for (const result of results) {
  lines.push(`## ${result.manifestName}`);
  lines.push("");
  lines.push(`- Resultado: ${result.ok ? "PASS" : "FAIL"}`);
  lines.push(
    `- Campos requeridos ausentes: ${result.missingFields.length ? result.missingFields.join(", ") : "ninguno"}`,
  );
  lines.push(`- Iconos declarados: ${result.icons.length}`);
  lines.push(
    `- Iconos faltantes en disco: ${result.missingIconFiles.length ? result.missingIconFiles.join(", ") : "ninguno"}`,
  );
  lines.push(`- Estrategia offline documentada en sw.js: ${result.offlineStrategyDocumented ? "sí" : "no"}`);
  if (result.violations.length) {
    lines.push(`- Violaciones: ${result.violations.join(", ")}`);
  }
  lines.push("");
}

lines.push("## Honestidad");
lines.push("");
lines.push(
  '- No se marca "iOS Safari install" como VERIFIED sin una prueba real en dispositivo/simulador — queda PARTIAL en este documento hasta que ops lo confirme manualmente.',
);
lines.push("- Este script solo audita manifest+sw en disco; no publica, despliega ni modifica nada.");
lines.push(
  "- Los iconos PWA de manifest-saas.json usan icon-base.svg (existente). Si se quiere un set PNG multi-tamaño, ejecutar `node apps/web/scripts/generate-pwa-icons.mjs` (usa `sharp`, ya en devDependencies) y actualizar el manifest.",
);
lines.push("");

const outDir = path.join(root, "scripts/docs/evidence/os-saas-e2e/modules");
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, "pwa.cert_latest.md");
fs.writeFileSync(outPath, lines.join("\n"));

console.log(`PWA certification ${overallOk ? "PASS" : "FAIL"} -> ${outPath}`);
if (!overallOk) {
  for (const result of results) {
    if (!result.ok) console.error(`${result.manifestName}: ${result.violations.join(", ")}`);
  }
  process.exitCode = 1;
}
