#!/usr/bin/env node
/** One-off prod check: migration 494 + CEO brief tables. Uses DATABASE_URL from env. */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const require = createRequire(path.join(root, "apps/web/package.json"));
const pg = require("pg");

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("railway.app") ? { rejectUnauthorized: false } : undefined,
});

try {
  const migration = await pool.query(
    "SELECT name, executed_at FROM _migrations WHERE name = $1",
    ["494_saas_ceo_brief.sql"],
  );
  const table = await pool.query(
    "SELECT to_regclass('public.saas_ceo_brief_settings') AS settings, to_regclass('public.saas_ceo_brief_runs') AS runs",
  );
  const indexes = await pool.query(
    "SELECT indexname FROM pg_indexes WHERE tablename IN ('saas_ceo_brief_settings', 'saas_ceo_brief_runs') ORDER BY indexname",
  );
  console.log(
    JSON.stringify(
      {
        migration494: migration.rows[0] ?? null,
        tables: table.rows[0],
        indexes: indexes.rows.map((r) => r.indexname),
      },
      null,
      2,
    ),
  );
} catch (e) {
  console.error("ERROR:", e.message);
  process.exit(1);
} finally {
  await pool.end();
}
