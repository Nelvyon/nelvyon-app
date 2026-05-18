/**
 * MIG 302 — Ejecuta migraciones SQL de Supabase/Postgres antes del primer deploy (o en cada release).
 * Uso: DATABASE_URL=... pnpm -C apps/web migrate:prod
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(scriptsDir, "..");
const migrateScript = path.resolve(webRoot, "../../backend/db/migrate.ts");

function main(): void {
  const dbUrl = process.env.DATABASE_URL?.trim();
  if (!dbUrl) {
    console.error("[migrate-prod] DATABASE_URL is required (Supabase Postgres connection string).");
    process.exit(1);
  }

  if (/anon|NEXT_PUBLIC_SUPABASE_ANON/i.test(dbUrl)) {
    console.warn("[migrate-prod] Warning: use service-role / pooler URL, not anon key.");
  }

  console.log("[migrate-prod] Applying migrations from backend/db/migrations …");
  const result = spawnSync("pnpm", ["exec", "tsx", migrateScript], {
    cwd: webRoot,
    stdio: "inherit",
    env: process.env,
    shell: process.platform === "win32",
  });

  if (result.error) {
    console.error("[migrate-prod] Failed to spawn tsx:", result.error.message);
    process.exit(1);
  }

  process.exit(result.status === null ? 1 : result.status);
}

main();
