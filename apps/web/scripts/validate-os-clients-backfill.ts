/**
 * Valida estado post-backfill nelvyon_clients ↔ os_clients.
 * Uso: DATABASE_URL=... pnpm validate:os-clients-backfill
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { DbClient } from "../../../backend/db/DbClient";
import { buildClientDedupeKey } from "../../../backend/os-core/osClientsDedupe";

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(scriptsDir, "..");
const repoRoot = path.resolve(webRoot, "../..");

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

export type OsClientsBackfillValidationReport = {
  executedAt: string;
  nelvyonClientsTotal: number;
  osClientsTotal: number;
  osClientsWithLegacyId: number;
  unmigratedLegacyCount: number;
  unmigratedLegacyIds: number[];
  duplicateDedupeGroupsInOs: number;
  duplicateDedupeGroupsInLegacy: number;
  ok: boolean;
};

async function tableExists(db: ReturnType<typeof DbClient.getInstance>, table: string): Promise<boolean> {
  const rows = await db.query<{ reg: string | null }>(
    "SELECT to_regclass($1)::text AS reg",
    [`public.${table}`],
  );
  return Boolean(rows[0]?.reg);
}

async function main(): Promise<void> {
  loadEnvFiles();
  if (!process.env.DATABASE_URL?.trim()) {
    console.error("[validate-os-clients-backfill] DATABASE_URL is required.");
    process.exit(1);
  }

  const db = DbClient.getInstance();
  let ok = true;

  const hasLegacy = await tableExists(db, "nelvyon_clients");
  const hasOs = await tableExists(db, "os_clients");

  if (!hasOs) {
    console.error("[validate-os-clients-backfill] FALTA tabla os_clients");
    process.exit(1);
  }

  const report: OsClientsBackfillValidationReport = {
    executedAt: new Date().toISOString(),
    nelvyonClientsTotal: 0,
    osClientsTotal: 0,
    osClientsWithLegacyId: 0,
    unmigratedLegacyCount: 0,
    unmigratedLegacyIds: [],
    duplicateDedupeGroupsInOs: 0,
    duplicateDedupeGroupsInLegacy: 0,
    ok: true,
  };

  const [osTotal] = await db.query<{ n: string }>("SELECT COUNT(*)::text AS n FROM os_clients");
  const [osLegacy] = await db.query<{ n: string }>(
    "SELECT COUNT(*)::text AS n FROM os_clients WHERE legacy_nelvyon_client_id IS NOT NULL",
  );
  report.osClientsTotal = Number(osTotal?.n ?? 0);
  report.osClientsWithLegacyId = Number(osLegacy?.n ?? 0);

  if (hasLegacy) {
    const [legTotal] = await db.query<{ n: string }>("SELECT COUNT(*)::text AS n FROM nelvyon_clients");
    report.nelvyonClientsTotal = Number(legTotal?.n ?? 0);

    const cols = await db.query<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'nelvyon_clients'`,
    );
    const colSet = new Set(cols.map((c) => c.column_name));
    const emailCol = colSet.has("contact_email") ? "contact_email" : "NULL::text AS contact_email";

    const [fullUnmigrated] = await db.query<{ n: string }>(
      `SELECT COUNT(*)::text AS n FROM nelvyon_clients nc
       LEFT JOIN os_clients oc ON oc.legacy_nelvyon_client_id = nc.id
       WHERE oc.id IS NULL`,
    );
    report.unmigratedLegacyCount = Number(fullUnmigrated?.n ?? 0);

    const unmigratedSample = await db.query<{ id: number }>(
      `SELECT nc.id FROM nelvyon_clients nc
       LEFT JOIN os_clients oc ON oc.legacy_nelvyon_client_id = nc.id
       WHERE oc.id IS NULL
       ORDER BY nc.id
       LIMIT 20`,
    );
    report.unmigratedLegacyIds = unmigratedSample.map((r) => r.id);

    const legacyRows = await db.query<{
      id: number;
      workspace_id: number | null;
      business_name: string;
      contact_email: string | null;
    }>(
      `SELECT id, workspace_id, business_name, ${emailCol.includes("NULL") ? "NULL::text AS contact_email" : "contact_email"}
       FROM nelvyon_clients WHERE workspace_id IS NOT NULL`,
    );
    const legacyGroups = new Map<string, number>();
    for (const r of legacyRows) {
      if (r.workspace_id == null) continue;
      const key = buildClientDedupeKey(r.workspace_id, r.contact_email, r.business_name);
      legacyGroups.set(key, (legacyGroups.get(key) ?? 0) + 1);
    }
    report.duplicateDedupeGroupsInLegacy = [...legacyGroups.values()].filter((n) => n > 1).length;
  }

  const osRows = await db.query<{
    workspace_id: number;
    business_name: string;
    contact_email: string | null;
  }>("SELECT workspace_id, business_name, contact_email FROM os_clients");
  const osGroups = new Map<string, number>();
  for (const r of osRows) {
    const key = buildClientDedupeKey(r.workspace_id, r.contact_email, r.business_name);
    osGroups.set(key, (osGroups.get(key) ?? 0) + 1);
  }
  report.duplicateDedupeGroupsInOs = [...osGroups.values()].filter((n) => n > 1).length;

  if (report.duplicateDedupeGroupsInOs > 0) {
    console.error(
      `[validate-os-clients-backfill] AVISO: ${report.duplicateDedupeGroupsInOs} grupos dedupe duplicados en os_clients`,
    );
    ok = false;
  }

  report.ok = ok;
  console.log(JSON.stringify(report, null, 2));
  await db.end();

  if (hasLegacy && report.unmigratedLegacyCount > 0) {
    console.warn(
      `[validate-os-clients-backfill] ${report.unmigratedLegacyCount} clientes legacy sin migrar (esperado pre-apply).`,
    );
  }

  if (report.duplicateDedupeGroupsInOs > 0) {
    process.exit(1);
  }
  console.log("[validate-os-clients-backfill] Validación OK.");
}

main().catch((err: unknown) => {
  console.error("[validate-os-clients-backfill] FATAL:", err);
  process.exit(1);
});
