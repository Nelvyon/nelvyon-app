/**
 * Bloque B — bridge + ETL contactos + ETL deals + auditoría final.
 *
 * Uso:
 *   DATABASE_URL=... pnpm saas:block-b -- --dry-run
 *   DATABASE_URL=... pnpm saas:block-b -- --execute
 *
 * Carga DATABASE_URL desde env o apps/web/.env.production.local / .env.local
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { DbClient } from "../../db/DbClient";
import { BlockBFinalAuditService } from "../BlockBFinalAudit";
import { getSaasCrmEtlService } from "../SaasCrmEtlService";
import { getSaasDealsEtlService } from "../SaasDealsEtlService";
import { getSaasTenantBridgeValidationService } from "../SaasTenantBridgeValidation";

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const saasRoot = path.resolve(scriptsDir, "..");
const repoRoot = path.resolve(saasRoot, "../..");
const webRoot = path.resolve(repoRoot, "apps/web");

function loadEnvFiles(): void {
  const files = [
    path.join(webRoot, ".env.production.local"),
    path.join(webRoot, ".env.local"),
    path.join(repoRoot, ".env.production"),
    path.join(repoRoot, ".env"),
  ];
  for (const file of files) {
    if (!fs.existsSync(file)) continue;
    for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

function hasUnresolvedConflicts(conflicts: { reason: string }[]): number {
  return conflicts.filter((c) => c.reason === "multiple_legacy_rows_same_dedupe_key").length;
}

async function main(): Promise<void> {
  loadEnvFiles();
  const argv = process.argv.slice(2);
  const execute = argv.includes("--execute");
  const dryRunOnly = argv.includes("--dry-run") || !execute;

  if (!process.env.DATABASE_URL?.trim()) {
    console.error(
      "[block-b] DATABASE_URL requerida. Añádela a apps/web/.env.production.local o al entorno.",
    );
    process.exit(1);
  }

  const out: Record<string, unknown> = { phase: "block-b", dryRunOnly, steps: [] };

  console.log("[block-b] 1/9 Validar bridge…");
  const bridge = await getSaasTenantBridgeValidationService().run();
  (out.steps as unknown[]).push({ step: "bridge", report: bridge });
  console.log(JSON.stringify({ bridge: { ok: bridge.ok, summary: bridge.summary } }, null, 2));
  if (!bridge.ok) {
    console.error("[block-b] Bridge inválido — corregir antes de ETL.");
    process.exit(1);
  }

  const crmEtl = getSaasCrmEtlService();
  const resolve = { resolveConflicts: true };

  console.log("[block-b] 2-3/9 Auditoría ETL contactos (dry-run)…");
  const crmDry = await crmEtl.run("dry-run", resolve);
  (out.steps as unknown[]).push({ step: "crm-etl-dry-run", report: crmDry });
  console.log(JSON.stringify(crmDry, null, 2));
  if (hasUnresolvedConflicts(crmDry.conflicts) > 0) {
    console.error("[block-b] Conflictos contactos sin resolver. Revisar reporte.");
    process.exit(1);
  }

  if (!dryRunOnly) {
    console.log("[block-b] 4-5/9 ETL contactos apply…");
    const crmApply = await crmEtl.run("apply", resolve);
    (out.steps as unknown[]).push({ step: "crm-etl-apply", report: crmApply });
    console.log(JSON.stringify(crmApply, null, 2));
    if (crmApply.errors.length > 0) process.exit(1);
  }

  const dealsEtl = getSaasDealsEtlService();

  console.log("[block-b] 6/9 Auditoría ETL deals (dry-run)…");
  const dealsDry = await dealsEtl.run("dry-run", resolve);
  (out.steps as unknown[]).push({ step: "deals-etl-dry-run", report: dealsDry });
  console.log(JSON.stringify(dealsDry, null, 2));
  if (hasUnresolvedConflicts(dealsDry.conflicts) > 0) {
    console.error("[block-b] Conflictos deals sin resolver.");
    process.exit(1);
  }
  if (dealsDry.skippedNoContact > 0) {
    console.warn(
      `[block-b] AVISO: ${dealsDry.skippedNoContact} deals legacy sin contacto ETL (huérfanos en dry-run).`,
    );
  }

  if (!dryRunOnly) {
    console.log("[block-b] 7-8/9 ETL deals apply…");
    const dealsApply = await dealsEtl.run("apply", resolve);
    (out.steps as unknown[]).push({ step: "deals-etl-apply", report: dealsApply });
    console.log(JSON.stringify(dealsApply, null, 2));
    if (dealsApply.errors.length > 0) process.exit(1);
  }

  console.log("[block-b] 9/9 Auditoría final…");
  const audit = await new BlockBFinalAuditService(DbClient.getInstance()).run();
  out.finalAudit = audit;
  console.log(JSON.stringify(audit, null, 2));

  const reportPath = path.join(repoRoot, "docs", "BLOCK_B_ETL_REPORT.json");
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(out, null, 2), "utf8");
  console.log(`[block-b] Reporte guardado: ${reportPath}`);

  await DbClient.getInstance().end();
  console.log("[block-b] OK");
}

main().catch((err: unknown) => {
  console.error("[block-b] FATAL:", err);
  process.exit(1);
});
