/**
 * MIG 302 / ADR-064 — Production-safe migration entrypoint for Railway preDeployCommand.
 *
 * Staging/dev: applies SQL via backend/db/migrate.ts (unchanged).
 * Production: applies only with explicit CEO-auditable approval env vars.
 *   NELVYON_PROD_MIGRATE_APPROVED=1
 *   NELVYON_PROD_MIGRATE_APPROVED_BY=<name>
 *   NELVYON_PROD_MIGRATE_COMMIT_SHA=<optional tip pin>
 *
 * Without approval: no-op success if nothing pending; fail deploy if pending > 0.
 *
 * Usage: DATABASE_URL=... pnpm -C apps/web migrate:prod
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { listPendingMigrations } from "../../../backend/db/listPendingMigrations";
import {
  evaluateProdMigrateGate,
  readProdMigrateApproval,
  resolveDeployEnvironment,
} from "../../../backend/db/prodMigrateGate";

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(scriptsDir, "..");
const migrateScript = path.resolve(webRoot, "../../backend/db/migrate.ts");

function runApply(): number {
  console.log("[migrate-prod] Applying migrations from backend/db/migrations …");
  const result = spawnSync("pnpm", ["exec", "tsx", migrateScript], {
    cwd: webRoot,
    stdio: "inherit",
    env: process.env,
    shell: process.platform === "win32",
  });
  if (result.error) {
    console.error("[migrate-prod] Failed to spawn tsx:", result.error.message);
    return 1;
  }
  return result.status === null ? 1 : result.status;
}

async function main(): Promise<void> {
  const dbUrl = process.env.DATABASE_URL?.trim();
  if (!dbUrl) {
    console.error("[migrate-prod] DATABASE_URL is required (Postgres connection string).");
    process.exit(1);
  }
  if (/anon|NEXT_PUBLIC_SUPABASE_ANON/i.test(dbUrl)) {
    console.warn("[migrate-prod] Warning: use service-role / pooler URL, not anon key.");
  }

  const deploy = resolveDeployEnvironment();
  const approval = readProdMigrateApproval();
  console.log(`[migrate-prod] deploy_env=${deploy.label} isProduction=${deploy.isProduction}`);

  let pending: string[] = [];
  try {
    pending = await listPendingMigrations();
  } catch (err: unknown) {
    console.error("[migrate-prod] Failed to list pending migrations:", err);
    process.exit(1);
  }
  console.log(`[migrate-prod] pending_count=${pending.length}`);
  if (pending.length) {
    for (const name of pending.slice(0, 20)) {
      console.log(`[migrate-prod] pending: ${name}`);
    }
    if (pending.length > 20) {
      console.log(`[migrate-prod] pending: … +${pending.length - 20} more`);
    }
  }

  const decision = evaluateProdMigrateGate({
    isProduction: deploy.isProduction,
    approval,
    pendingCount: pending.length,
  });
  console.log(`[migrate-prod] gate: ${decision.message}`);

  if (!decision.allowApply) {
    process.exit(decision.exitCode);
  }

  process.exit(runApply());
}

main().catch((err: unknown) => {
  console.error("[migrate-prod] FATAL:", err);
  process.exit(1);
});
