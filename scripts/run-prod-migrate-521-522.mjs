#!/usr/bin/env node
/**
 * One-shot prod migrate 521–522 via ADR-064 gate (CEO-authorized Phase 1).
 * Usage: railway run -s Postgres -e production -- node scripts/run-prod-migrate-521-522.mjs
 * Never prints connection strings.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

// Outside Railway private network, prefer PUBLIC URL (internal host is unreachable).
const publicUrl = process.env.DATABASE_PUBLIC_URL?.trim();
const internalUrl = process.env.DATABASE_URL?.trim();
if (publicUrl) {
  process.env.DATABASE_URL = publicUrl;
} else if (!internalUrl) {
  console.error("Missing DATABASE_URL / DATABASE_PUBLIC_URL");
  process.exit(2);
}

process.env.NELVYON_DEPLOY_ENV = "production";
process.env.NELVYON_PROD_MIGRATE_APPROVED = "1";
process.env.NELVYON_PROD_MIGRATE_APPROVED_BY =
  process.env.NELVYON_PROD_MIGRATE_APPROVED_BY?.trim() || "Daniel";
process.env.NELVYON_PROD_MIGRATE_COMMIT_SHA =
  process.env.NELVYON_PROD_MIGRATE_COMMIT_SHA?.trim() || "0d7d6e90";

console.log(
  `[run-prod-migrate] approved_by=${process.env.NELVYON_PROD_MIGRATE_APPROVED_BY} pin=${process.env.NELVYON_PROD_MIGRATE_COMMIT_SHA} using_public=${Boolean(process.env.DATABASE_PUBLIC_URL)}`,
);

const r = spawnSync("pnpm", ["-C", "apps/web", "migrate:prod"], {
  cwd: root,
  stdio: "inherit",
  env: process.env,
  shell: process.platform === "win32",
});
process.exit(r.status ?? 1);
