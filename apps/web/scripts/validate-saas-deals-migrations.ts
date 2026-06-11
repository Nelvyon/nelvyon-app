/**
 * Valida migraciones Fase 3A (312 + 313) y tabla saas_deals.
 * Uso: DATABASE_URL=... pnpm -C apps/web validate:saas-deals-migrations
 */
import { DbClient } from "../../../backend/db/DbClient";
import { loadEnvFiles } from "../../../backend/db/loadEnvFiles";

const REQUIRED_MIGRATIONS = ["312_saas_deals.sql", "313_saas_deals_rls.sql"] as const;

async function main(): Promise<void> {
  loadEnvFiles();
  const dbUrl = process.env.DATABASE_URL?.trim();
  if (!dbUrl) {
    console.error("[validate-saas-deals] DATABASE_URL is required.");
    process.exit(1);
  }

  const db = DbClient.getInstance();
  let ok = true;

  console.log("[validate-saas-deals] Comprobando migraciones registradas…");
  for (const name of REQUIRED_MIGRATIONS) {
    const rows = await db.query<{ name: string }>(
      "SELECT name FROM _migrations WHERE name = $1",
      [name],
    );
    if (rows.length === 0) {
      console.error(`[validate-saas-deals] FALTA migración en _migrations: ${name}`);
      ok = false;
    } else {
      console.log(`[validate-saas-deals] OK _migrations: ${name}`);
    }
  }

  const tableRows = await db.query<{ reg: string | null }>(
    "SELECT to_regclass('public.saas_deals')::text AS reg",
  );
  if (!tableRows[0]?.reg) {
    console.error("[validate-saas-deals] FALTA tabla: saas_deals");
    ok = false;
  } else {
    const countRows = await db.query<{ n: string }>("SELECT COUNT(*)::text AS n FROM saas_deals");
    console.log(`[validate-saas-deals] OK tabla saas_deals (filas: ${countRows[0]?.n ?? "0"})`);
  }

  const rlsRows = await db.query<{ relrowsecurity: boolean; relforcerowsecurity: boolean }>(
    `SELECT c.relrowsecurity, c.relforcerowsecurity
     FROM pg_class c
     JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relname = 'saas_deals'`,
  );
  if (rlsRows[0]) {
    if (!rlsRows[0].relrowsecurity) {
      console.error("[validate-saas-deals] RLS no habilitado en saas_deals");
      ok = false;
    } else {
      console.log("[validate-saas-deals] OK RLS habilitado en saas_deals");
    }
  }

  await db.end();
  if (!ok) {
    console.error("[validate-saas-deals] Validación fallida.");
    process.exit(1);
  }
  console.log("[validate-saas-deals] Validación OK.");
}

main().catch((err: unknown) => {
  console.error("[validate-saas-deals] FATAL:", err);
  process.exit(1);
});
