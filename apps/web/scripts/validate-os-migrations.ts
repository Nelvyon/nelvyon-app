/**
 * Valida tablas OS requeridas en producción (281 + 282).
 * Uso: DATABASE_URL=... pnpm -C apps/web validate:os-migrations
 */
import { DbClient } from "../../../backend/db/DbClient";

const REQUIRED_TABLES = ["os_deals", "os_tasks", "os_expenses", "os_cashflow"] as const;

const REQUIRED_MIGRATIONS = [
  "281_os_deals_tasks.sql",
  "282_os_expenses_cashflow.sql",
] as const;

async function main(): Promise<void> {
  const dbUrl = process.env.DATABASE_URL?.trim();
  if (!dbUrl) {
    console.error("[validate-os] DATABASE_URL is required.");
    process.exit(1);
  }

  const db = DbClient.getInstance();
  let ok = true;

  console.log("[validate-os] Comprobando migraciones registradas…");
  for (const name of REQUIRED_MIGRATIONS) {
    const rows = await db.query<{ name: string }>(
      "SELECT name FROM _migrations WHERE name = $1",
      [name],
    );
    if (rows.length === 0) {
      console.error(`[validate-os] FALTA migración en _migrations: ${name}`);
      ok = false;
    } else {
      console.log(`[validate-os] OK _migrations: ${name}`);
    }
  }

  console.log("[validate-os] Comprobando tablas…");
  for (const table of REQUIRED_TABLES) {
    const rows = await db.query<{ reg: string | null }>(
      "SELECT to_regclass($1)::text AS reg",
      [`public.${table}`],
    );
    if (!rows[0]?.reg) {
      console.error(`[validate-os] FALTA tabla: ${table}`);
      ok = false;
    } else {
      const countRows = await db.query<{ n: string }>(
        `SELECT COUNT(*)::text AS n FROM ${table}`,
      );
      console.log(`[validate-os] OK tabla ${table} (filas: ${countRows[0]?.n ?? "?"})`);
    }
  }

  await db.end();

  if (!ok) {
    console.error(
      "[validate-os] Incompleto. Ejecuta: cd apps/web && pnpm migrate:prod (con DATABASE_URL de producción)",
    );
    process.exit(1);
  }

  console.log("[validate-os] Listo — /os/pipeline, /os/tareas, /os/finanzas y /os/dashboard pueden usar estas tablas.");
  process.exit(0);
}

main().catch((err: unknown) => {
  console.error("[validate-os] FATAL:", err);
  process.exit(1);
});
