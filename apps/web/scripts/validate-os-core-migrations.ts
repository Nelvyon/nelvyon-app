/**
 * Valida migración OS-1-01 (315) y tabla os_clients.
 * Uso: DATABASE_URL=... pnpm -C apps/web validate:os-core-migrations
 */
import { DbClient } from "../../../backend/db/DbClient";

const REQUIRED_MIGRATION = "315_os_clients.sql" as const;

const REQUIRED_COLUMNS = [
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

async function main(): Promise<void> {
  const dbUrl = process.env.DATABASE_URL?.trim();
  if (!dbUrl) {
    console.error("[validate-os-core] DATABASE_URL is required.");
    process.exit(1);
  }

  const db = DbClient.getInstance();
  let ok = true;

  console.log("[validate-os-core] Comprobando migración registrada…");
  const migRows = await db.query<{ name: string }>(
    "SELECT name FROM _migrations WHERE name = $1",
    [REQUIRED_MIGRATION],
  );
  if (migRows.length === 0) {
    console.error(`[validate-os-core] FALTA migración en _migrations: ${REQUIRED_MIGRATION}`);
    ok = false;
  } else {
    console.log(`[validate-os-core] OK _migrations: ${REQUIRED_MIGRATION}`);
  }

  const tableRows = await db.query<{ reg: string | null }>(
    "SELECT to_regclass('public.os_clients')::text AS reg",
  );
  if (!tableRows[0]?.reg) {
    console.error("[validate-os-core] FALTA tabla: os_clients");
    ok = false;
  } else {
    const countRows = await db.query<{ n: string }>("SELECT COUNT(*)::text AS n FROM os_clients");
    console.log(`[validate-os-core] OK tabla os_clients (filas: ${countRows[0]?.n ?? "0"})`);
  }

  if (tableRows[0]?.reg) {
    const colRows = await db.query<{ column_name: string }>(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'os_clients'`,
    );
    const present = new Set(colRows.map((r) => r.column_name));
    for (const col of REQUIRED_COLUMNS) {
      if (!present.has(col)) {
        console.error(`[validate-os-core] FALTA columna os_clients.${col}`);
        ok = false;
      }
    }
    if (ok) {
      console.log(`[validate-os-core] OK columnas requeridas (${REQUIRED_COLUMNS.length})`);
    }

    const statusCheck = await db.query<{ def: string }>(
      `SELECT pg_get_constraintdef(c.oid) AS def
       FROM pg_constraint c
       JOIN pg_class t ON t.oid = c.conrelid
       JOIN pg_namespace n ON n.oid = t.relnamespace
       WHERE n.nspname = 'public' AND t.relname = 'os_clients'
         AND c.contype = 'c' AND c.conname LIKE '%status%'`,
    );
    const statusOk = statusCheck.some((r) => r.def?.includes("'active'") && r.def?.includes("'archived'"));
    if (!statusOk) {
      console.error("[validate-os-core] CHECK status (active/archived) no encontrado en os_clients");
      ok = false;
    } else {
      console.log("[validate-os-core] OK CHECK status active/archived");
    }
  }

  await db.end();
  if (!ok) {
    console.error("[validate-os-core] Validación fallida.");
    process.exit(1);
  }
  console.log("[validate-os-core] Validación OK.");
}

main().catch((err: unknown) => {
  console.error("[validate-os-core] FATAL:", err);
  process.exit(1);
});
