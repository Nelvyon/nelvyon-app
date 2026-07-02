/**
 * Valida estado post-backfill nelvyon_projects ↔ os_projects.
 * Uso: pnpm validate:os-projects-backfill
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { DbClient } from "../../../backend/db/DbClient";
import {
  LEGACY_PROJECT_SOURCE,
  buildProjectFallbackDedupeKey,
} from "../../../backend/os-core/osProjectsDedupe";

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

export type OsProjectsBackfillValidationReport = {
  executedAt: string;
  nelvyonProjectsTotal: number;
  osProjectsTotal: number;
  osProjectsWithLegacyMetadata: number;
  unmigratedLegacyCount: number;
  unmigratedLegacyIds: number[];
  projectsWithoutClientMapping: number;
  projectsWithoutClientSample: Array<{ legacyId: number; legacyClientId: number; workspaceId: number | null }>;
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
    console.error("[validate-os-projects-backfill] DATABASE_URL is required.");
    process.exit(1);
  }

  const db = DbClient.getInstance();
  let ok = true;

  const hasLegacy = await tableExists(db, "nelvyon_projects");
  const hasOs = await tableExists(db, "os_projects");
  const hasClients = await tableExists(db, "os_clients");

  if (!hasOs) {
    console.error("[validate-os-projects-backfill] FALTA tabla os_projects");
    process.exit(1);
  }

  const report: OsProjectsBackfillValidationReport = {
    executedAt: new Date().toISOString(),
    nelvyonProjectsTotal: 0,
    osProjectsTotal: 0,
    osProjectsWithLegacyMetadata: 0,
    unmigratedLegacyCount: 0,
    unmigratedLegacyIds: [],
    projectsWithoutClientMapping: 0,
    projectsWithoutClientSample: [],
    duplicateDedupeGroupsInOs: 0,
    duplicateDedupeGroupsInLegacy: 0,
    ok: true,
  };

  const [osTotal] = await db.query<{ n: string }>("SELECT COUNT(*)::text AS n FROM os_projects");
  const [osLegacy] = await db.query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM os_projects WHERE metadata->>'source' = $1`,
    [LEGACY_PROJECT_SOURCE],
  );
  report.osProjectsTotal = Number(osTotal?.n ?? 0);
  report.osProjectsWithLegacyMetadata = Number(osLegacy?.n ?? 0);

  if (hasLegacy) {
    const [legTotal] = await db.query<{ n: string }>("SELECT COUNT(*)::text AS n FROM nelvyon_projects");
    report.nelvyonProjectsTotal = Number(legTotal?.n ?? 0);

    const migratedIds = await db.query<{ legacy_id: string }>(
      `SELECT metadata->>'legacy_nelvyon_project_id' AS legacy_id
       FROM os_projects WHERE metadata->>'source' = $1`,
      [LEGACY_PROJECT_SOURCE],
    );
    const migratedSet = new Set(
      migratedIds.map((r) => Number(r.legacy_id)).filter((n) => Number.isFinite(n)),
    );

    const legacyRows = await db.query<{
      id: number;
      workspace_id: number | null;
      client_id: number;
      name: string;
    }>("SELECT id, workspace_id, client_id, name FROM nelvyon_projects ORDER BY id");

    report.unmigratedLegacyCount = legacyRows.filter((r) => !migratedSet.has(r.id)).length;
    report.unmigratedLegacyIds = legacyRows
      .filter((r) => !migratedSet.has(r.id))
      .slice(0, 20)
      .map((r) => r.id);

    if (hasClients) {
      const bridgeRows = await db.query<{ workspace_id: number; legacy_nelvyon_client_id: number }>(
        `SELECT workspace_id, legacy_nelvyon_client_id FROM os_clients
         WHERE legacy_nelvyon_client_id IS NOT NULL`,
      );
      const bridge = new Set(
        bridgeRows.map((r) => `${r.workspace_id}:${r.legacy_nelvyon_client_id}`),
      );
      const noClient = legacyRows.filter(
        (r) =>
          !migratedSet.has(r.id) &&
          (r.workspace_id == null || !bridge.has(`${r.workspace_id}:${r.client_id}`)),
      );
      report.projectsWithoutClientMapping = noClient.length;
      report.projectsWithoutClientSample = noClient.slice(0, 10).map((r) => ({
        legacyId: r.id,
        legacyClientId: r.client_id,
        workspaceId: r.workspace_id,
      }));
    }

    const legacyGroups = new Map<string, number>();
    for (const r of legacyRows) {
      if (r.workspace_id == null) continue;
      const key = `ws:${r.workspace_id}|name:${r.name.trim().toLowerCase()}|client:${r.client_id}`;
      legacyGroups.set(key, (legacyGroups.get(key) ?? 0) + 1);
    }
    report.duplicateDedupeGroupsInLegacy = [...legacyGroups.values()].filter((n) => n > 1).length;
  }

  const osRows = await db.query<{
    workspace_id: number;
    client_id: string;
    name: string;
  }>("SELECT workspace_id, client_id, name FROM os_projects");
  const osGroups = new Map<string, number>();
  for (const r of osRows) {
    const key = buildProjectFallbackDedupeKey(r.workspace_id, r.client_id, r.name);
    osGroups.set(key, (osGroups.get(key) ?? 0) + 1);
  }
  report.duplicateDedupeGroupsInOs = [...osGroups.values()].filter((n) => n > 1).length;

  if (report.duplicateDedupeGroupsInOs > 0) {
    console.error(
      `[validate-os-projects-backfill] AVISO: ${report.duplicateDedupeGroupsInOs} grupos dedupe duplicados en os_projects`,
    );
    ok = false;
  }

  report.ok = ok;
  console.log(JSON.stringify(report, null, 2));
  await db.end();

  if (report.unmigratedLegacyCount > 0) {
    console.warn(
      `[validate-os-projects-backfill] ${report.unmigratedLegacyCount} proyectos legacy sin migrar (esperado pre-apply o sin cliente OS).`,
    );
  }
  if (report.projectsWithoutClientMapping > 0) {
    console.warn(
      `[validate-os-projects-backfill] ${report.projectsWithoutClientMapping} proyectos legacy sin cliente OS mapeable.`,
    );
  }

  if (report.duplicateDedupeGroupsInOs > 0) {
    process.exit(1);
  }
  console.log("[validate-os-projects-backfill] Validación OK.");
}

main().catch((err: unknown) => {
  console.error("[validate-os-projects-backfill] FATAL:", err);
  process.exit(1);
});
