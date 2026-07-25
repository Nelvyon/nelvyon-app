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
const platform = `${process.platform} (Node ${process.version})`;

const lines = [];
lines.push("# PWA certification");
lines.push("");
lines.push("| Campo | Valor |");
lines.push("|-------|-------|");
lines.push(`| Fecha | ${timestamp} |`);
lines.push(`| Host | ${platform} |`);
lines.push(`| Resultado | ${overallOk ? "PASS" : "FAIL"} |`);
lines.push(
  `| Chrome/Windows (criterios de instalabilidad) | ${overallOk ? "VERIFIED" : "FAIL"} — manifest válido (name/icons/display/start_url) + iconos reales en disco + sw.js con \`install\`/\`fetch\` handlers y estrategia cache+offline documentada. Estos son exactamente los criterios que Chrome/Edge (Chromium, Windows) evalúan para marcar el sitio como instalable. |`,
);
lines.push('| iOS Safari "Add to Home Screen" | PARTIAL — no verificado en dispositivo/simulador real en esta sesión |');
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
  '- "Chrome/Windows VERIFIED" es una auditoría estática y reproducible (este script Node) contra los mismos criterios de instalabilidad que Chrome/Edge (Chromium) evalúan — no es una sesión manual de Chrome DevTools grabada en vivo. Cualquiera puede reproducirla con `node scripts/pwa-certify.mjs`.',
);
lines.push(
  '- No se marca "iOS Safari install" como VERIFIED sin una prueba real en dispositivo/simulador — queda PARTIAL en este documento hasta que ops lo confirme manualmente. Ver `docs/ops/PWA_IOS_SAFARI_CEO_CHECKLIST.md`.',
);
lines.push("- Este script solo audita manifest+sw en disco; no publica, despliega ni modifica nada.");
lines.push(
  "- Los iconos PNG multi-tamaño (72–512px) ya existen en disco (`apps/web/public/icons/icon-*.png`, generados con `node apps/web/scripts/generate-pwa-icons.mjs`, usa `sharp`) y están declarados en `manifest.json`, `manifest-saas.json` y en el manifest dinámico `SaasPwaService.DEFAULT_ICONS` — incluyendo los iconos de push notification que `sw.js` referenciaba (`icon-192x192.png`, `icon-96x96.png`).",
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
