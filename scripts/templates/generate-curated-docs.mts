/**
 * Generates docs/templates/CURATED_SEED_LIBRARY.md
 * Run: pnpm --dir apps/web exec tsx ../../scripts/templates/generate-curated-docs.mts
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  CURATED_SEED_LIMIT,
  CURATED_SEED_STATS,
  CURATED_SEEDS,
} from "../../apps/web/src/lib/template-library/curated-seed-library.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outPath = path.resolve(__dirname, "../../docs/templates/CURATED_SEED_LIBRARY.md");

const stats = CURATED_SEED_STATS;

const providerRows = Object.entries(stats.by_provider)
  .map(([k, v]) => `| ${k} | ${v} |`)
  .join("\n");

const kindRows = Object.entries(stats.by_kind)
  .sort((a, b) => b[1] - a[1])
  .map(([k, v]) => `| ${k} | ${v} |`)
  .join("\n");

const sectorRows = Object.entries(stats.by_sector_group)
  .sort((a, b) => b[1] - a[1])
  .map(([k, v]) => `| ${k} | ${v} |`)
  .join("\n");

const topQuality = [...CURATED_SEEDS]
  .sort((a, b) => b.quality_score - a.quality_score)
  .slice(0, 30)
  .map((s) => `| ${s.provider} | ${s.item_name} | ${s.primary_kind} | ${s.quality_score} |`)
  .join("\n");

const doc = `# Biblioteca curada de seeds — máx. ${CURATED_SEED_LIMIT}

> **Generado automáticamente** · Regenerar: \`pnpm --dir apps/web exec tsx ../../scripts/templates/generate-curated-docs.mts\`

## Resumen

| Métrica | Valor |
|---------|-------|
| **Seeds curados (límite)** | ${stats.total} / ${stats.limit} |
| **Buckets variedad** (sector_group × kind) | ${stats.variety_buckets} |
| **Proveedor Envato** | ${stats.by_provider.EnvatoElements ?? 0} |
| **Proveedor Aceternity** | ${stats.by_provider.Aceternity ?? 0} |

## Por proveedor

| Proveedor | Seeds |
|-----------|-------|
${providerRows}

## Por tipo (kind primario)

| Kind | Seeds |
|------|-------|
${kindRows}

## Por sector group

| Sector group | Seeds |
|--------------|-------|
${sectorRows}

## Variedad cliente

Dos clientes del mismo sector reciben seeds distintos gracias a \`pickCuratedSeed({ varietyKey })\` — hash estable por negocio/pack run sobre ${stats.variety_buckets} buckets de alternativas.

## Top calidad (muestra)

| Proveedor | Item | Kind | Score |
|-----------|------|------|-------|
${topQuality}

---

*Última generación: ${new Date().toISOString().slice(0, 10)}*
`;

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, doc, "utf8");
console.log(`Wrote ${outPath} (${stats.total} seeds)`);
