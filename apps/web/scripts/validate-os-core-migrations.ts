/**
 * Valida migración OS-1-01 (315) y tabla os_clients.
 * Uso: DATABASE_URL=... pnpm -C apps/web validate:os-core-migrations
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { DbClient } from "../../../backend/db/DbClient";

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

const REQUIRED_MIGRATIONS = ["315_os_clients.sql", "316_os_projects.sql"] as const;

const OS_CLIENTS_COLUMNS = [
  "id",
  "workspace_id",
  "created_by_user_id",
  "business_name",
  "status",
  "legacy_nelvyon_client_id",
  "metadata",
  "created_at",
  "updated_at",
] as const;

const OS_PROJECTS_COLUMNS = [
  "id",
  "workspace_id",
  "client_id",
  "name",
  "description",
  "status",
  "priority",
  "start_date",
  "due_date",
  "budget",
  "metadata",
  "created_at",
  "updated_at",
  "archived_at",
] as const;

const OS_PROJECTS_INDEXES = [
  "idx_os_projects_workspace",
  "idx_os_projects_client",
  "idx_os_projects_status",
  "idx_os_projects_due_date",
  "idx_os_projects_updated_at",
] as const;

async function tableExists(db: ReturnType<typeof DbClient.getInstance>, table: string): Promise<boolean> {
  const rows = await db.query<{ reg: string | null }>(
    "SELECT to_regclass($1)::text AS reg",
    [`public.${table}`],
  );
  return Boolean(rows[0]?.reg);
}

async function checkColumns(
  db: ReturnType<typeof DbClient.getInstance>,
  table: string,
  required: readonly string[],
): Promise<boolean> {
  const colRows = await db.query<{ column_name: string }>(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1`,
    [table],
  );
  const present = new Set(colRows.map((r) => r.column_name));
  let ok = true;
  for (const col of required) {
    if (!present.has(col)) {
      console.error(`[validate-os-core] FALTA columna ${table}.${col}`);
      ok = false;
    }
  }
  if (ok) {
    console.log(`[validate-os-core] OK columnas ${table} (${required.length})`);
  }
  return ok;
}

async function checkCheckConstraint(
  db: ReturnType<typeof DbClient.getInstance>,
  table: string,
  constraintHint: string,
  mustInclude: string[],
): Promise<boolean> {
  const rows = await db.query<{ def: string }>(
    `SELECT pg_get_constraintdef(c.oid) AS def
     FROM pg_constraint c
     JOIN pg_class t ON t.oid = c.conrelid
     JOIN pg_namespace n ON n.oid = t.relnamespace
     WHERE n.nspname = 'public' AND t.relname = $1
       AND c.contype = 'c' AND c.conname LIKE $2`,
    [table, `%${constraintHint}%`],
  );
  const ok = rows.some((r) => mustInclude.every((token) => r.def?.includes(token)));
  if (!ok) {
    console.error(
      `[validate-os-core] CHECK ${constraintHint} no encontrado en ${table} (esperado: ${mustInclude.join(", ")})`,
    );
  } else {
    console.log(`[validate-os-core] OK CHECK ${table}.${constraintHint}`);
  }
  return ok;
}

async function main(): Promise<void> {
  loadEnvFiles();
  const dbUrl = process.env.DATABASE_URL?.trim();
  if (!dbUrl) {
    console.error("[validate-os-core] DATABASE_URL is required.");
    process.exit(1);
  }

  const db = DbClient.getInstance();
  let ok = true;

  console.log("[validate-os-core] Comprobando migraciones registradas…");
  for (const name of REQUIRED_MIGRATIONS) {
    const migRows = await db.query<{ name: string }>(
      "SELECT name FROM _migrations WHERE name = $1",
      [name],
    );
    if (migRows.length === 0) {
      console.error(`[validate-os-core] FALTA migración en _migrations: ${name}`);
      ok = false;
    } else {
      console.log(`[validate-os-core] OK _migrations: ${name}`);
    }
  }

  const hasClients = await tableExists(db, "os_clients");
  if (!hasClients) {
    console.error("[validate-os-core] FALTA tabla: os_clients");
    ok = false;
  } else {
    const countRows = await db.query<{ n: string }>("SELECT COUNT(*)::text AS n FROM os_clients");
    console.log(`[validate-os-core] OK tabla os_clients (filas: ${countRows[0]?.n ?? "0"})`);
    ok = (await checkColumns(db, "os_clients", OS_CLIENTS_COLUMNS)) && ok;
    ok =
      (await checkCheckConstraint(db, "os_clients", "status", ["'active'", "'archived'"])) && ok;
  }

  const hasProjects = await tableExists(db, "os_projects");
  if (!hasProjects) {
    console.error("[validate-os-core] FALTA tabla: os_projects");
    ok = false;
  } else {
    const countRows = await db.query<{ n: string }>("SELECT COUNT(*)::text AS n FROM os_projects");
    console.log(`[validate-os-core] OK tabla os_projects (filas: ${countRows[0]?.n ?? "0"})`);
    ok = (await checkColumns(db, "os_projects", OS_PROJECTS_COLUMNS)) && ok;

    ok =
      (await checkCheckConstraint(db, "os_projects", "status", [
        "'draft'",
        "'active'",
        "'archived'",
      ])) && ok;
    ok =
      (await checkCheckConstraint(db, "os_projects", "priority", [
        "'low'",
        "'medium'",
        "'urgent'",
      ])) && ok;

    const fkRows = await db.query<{ def: string }>(
      `SELECT pg_get_constraintdef(c.oid) AS def
       FROM pg_constraint c
       JOIN pg_class t ON t.oid = c.conrelid
       JOIN pg_namespace n ON n.oid = t.relnamespace
       WHERE n.nspname = 'public' AND t.relname = 'os_projects'
         AND c.contype = 'f'`,
    );
    const fkOk = fkRows.some(
      (r) => r.def?.includes("os_clients") && r.def?.includes("client_id"),
    );
    if (!fkOk) {
      console.error("[validate-os-core] FALTA FK os_projects.client_id → os_clients(id)");
      ok = false;
    } else {
      console.log("[validate-os-core] OK FK client_id → os_clients");
    }

    for (const idx of OS_PROJECTS_INDEXES) {
      const idxRows = await db.query<{ reg: string | null }>(
        "SELECT to_regclass($1)::text AS reg",
        [`public.${idx}`],
      );
      if (!idxRows[0]?.reg) {
        console.error(`[validate-os-core] FALTA índice: ${idx}`);
        ok = false;
      } else {
        console.log(`[validate-os-core] OK índice ${idx}`);
      }
    }
  }

  await db.end();
  if (!ok) {
    console.error("[validate-os-core] Validación fallida.");
    process.exit(1);
  }
  console.log("[validate-os-core] Validación OK (315 os_clients + 316 os_projects).");
}

main().catch((err: unknown) => {
  console.error("[validate-os-core] FATAL:", err);
  process.exit(1);
});
