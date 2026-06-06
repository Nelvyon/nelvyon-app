/**
 * OS-1-02 — backfill nelvyon_clients → os_clients
 *
 * Uso:
 *   pnpm os:clients-backfill -- --dry-run
 *   pnpm os:clients-backfill -- --apply --i-understand-apply
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { DbClient } from "../../db/DbClient";
import { getOsClientsBackfillService, type OsClientsBackfillMode } from "../OsClientsBackfillService";

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const osCoreRoot = path.resolve(scriptsDir, "..");
const repoRoot = path.resolve(osCoreRoot, "../..");
const webRoot = path.resolve(repoRoot, "apps/web");

function loadEnvFiles(): void {
  const files = [
    path.join(webRoot, ".env.production.local"),
    path.join(webRoot, ".env.production.local.txt"),
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

function parseMode(argv: string[]): OsClientsBackfillMode {
  return argv.includes("--apply") ? "apply" : "dry-run";
}

async function main(): Promise<void> {
  loadEnvFiles();
  const argv = process.argv.slice(2);
  const mode = parseMode(argv);

  if (!process.env.DATABASE_URL?.trim()) {
    console.error("[os-clients-backfill] DATABASE_URL requerida.");
    process.exit(1);
  }

  if (mode === "apply" && !argv.includes("--i-understand-apply")) {
    console.error(
      "[os-clients-backfill] Para apply añade --i-understand-apply (solo INSERT; no borra nelvyon_clients).",
    );
    process.exit(1);
  }

  const report = await getOsClientsBackfillService().run(mode);
  console.log(JSON.stringify(report, null, 2));

  const outPath = path.join(repoRoot, "docs", "OS_CLIENTS_BACKFILL_REPORT.json");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2), "utf8");
  console.log(`[os-clients-backfill] Reporte: ${outPath}`);

  await DbClient.getInstance().end();

  if (report.errors.some((e) => e.legacyId === 0)) {
    process.exit(1);
  }
  if (
    mode === "apply" &&
    report.conflicts.some((c) => c.reason === "multiple_legacy_rows_same_dedupe_key")
  ) {
    process.exit(1);
  }
}

main().catch((err: unknown) => {
  console.error("[os-clients-backfill] FATAL:", err);
  process.exit(1);
});
