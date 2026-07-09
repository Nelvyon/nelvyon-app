#!/usr/bin/env node
/**
 * Apply and verify migration 494_saas_ceo_brief.sql against DATABASE_URL.
 * Usage: DATABASE_URL=... pnpm -C apps/web exec tsx ../../scripts/apply-migration-494.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const require = createRequire(path.join(root, "apps/web/package.json"));
const pg = require("pg");

const MIGRATION = "494_saas_ceo_brief.sql";
const sqlPath = path.join(root, "backend/db/migrations", MIGRATION);

const dbUrl = process.env.DATABASE_URL?.trim();
if (!dbUrl) {
  console.error("DATABASE_URL required");
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: dbUrl,
  ssl: dbUrl.includes("railway.app") ? { rejectUnauthorized: false } : undefined,
});

async function verify() {
  const mig = await pool.query("SELECT name, executed_at FROM _migrations WHERE name = $1", [MIGRATION]);
  const tables = await pool.query(
    "SELECT to_regclass('public.saas_ceo_brief_settings') AS settings, to_regclass('public.saas_ceo_brief_runs') AS runs",
  );
  const indexes = await pool.query(
    "SELECT indexname FROM pg_indexes WHERE tablename IN ('saas_ceo_brief_settings', 'saas_ceo_brief_runs') ORDER BY indexname",
  );
  return {
    migration: mig.rows[0] ?? null,
    tables: tables.rows[0],
    indexes: indexes.rows.map((r) => r.indexname),
  };
}

try {
  const before = await verify();
  console.log("[494] before:", JSON.stringify(before, null, 2));

  const settingsMissing = before.tables.settings === null;
  const runsMissing = before.tables.runs === null;
  const migMissing = !before.migration;

  if (settingsMissing || runsMissing) {
    const sql = fs.readFileSync(sqlPath, "utf8");
    console.log("[494] applying SQL from", MIGRATION);
    await pool.query(sql);
  } else {
    console.log("[494] tables already exist — skip SQL");
  }

  if (migMissing) {
    await pool.query("INSERT INTO _migrations (name) VALUES ($1) ON CONFLICT (name) DO NOTHING", [MIGRATION]);
    console.log("[494] registered in _migrations");
  }

  const after = await verify();
  console.log("[494] after:", JSON.stringify(after, null, 2));

  if (after.tables.settings === null || after.tables.runs === null) {
    console.error("[494] FAIL: tables still missing");
    process.exit(1);
  }
  if (!after.indexes.includes("idx_ceo_brief_runs_tenant_created")) {
    console.error("[494] FAIL: index idx_ceo_brief_runs_tenant_created missing");
    process.exit(1);
  }
  console.log("[494] OK");
} catch (e) {
  console.error("[494] ERROR:", e.message);
  process.exit(1);
} finally {
  await pool.end();
}
