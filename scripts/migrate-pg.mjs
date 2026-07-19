#!/usr/bin/env node
/**
 * Apply backend/db/migrations/*.sql to DATABASE_URL (plain Node + pg).
 * Uses statement splitter for 507 consolidated migration (KI-017 parity with migrate.ts).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import {
  splitSqlStatements,
  isTolerableConsolidatedMigrationError,
} from "./lib/splitSqlStatements.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const require = createRequire(path.join(ROOT, "backend", "db", "package.json"));
const pg = require("pg");
const migrationsDir = path.join(ROOT, "backend", "db", "migrations");
const CONSOLIDATED = "507_fastapi_runtime_schemas.sql";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL required");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: url, connectionTimeoutMillis: 15_000 });

async function runConsolidated(file, sql) {
  const statements = splitSqlStatements(sql);
  let ok = 0;
  let warned = 0;
  for (const stmt of statements) {
    try {
      await pool.query(stmt);
      ok += 1;
    } catch (err) {
      if (isTolerableConsolidatedMigrationError(err)) {
        warned += 1;
        console.warn(`[migrate] warn ${file}: ${(err.message || String(err)).slice(0, 120)}`);
        continue;
      }
      throw err;
    }
  }
  console.log(`[migrate] ${file}: ${ok} statements ok, ${warned} warnings (legacy schema drift)`);
}

async function main() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      name text PRIMARY KEY,
      executed_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();
  let ran = 0;
  let skipped = 0;
  let failed = null;
  for (const file of files) {
    const rows = await pool.query("SELECT name FROM _migrations WHERE name = $1", [file]);
    if (rows.rowCount > 0) {
      skipped += 1;
      continue;
    }
    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
    process.stdout.write(`[migrate] run: ${file} ... `);
    try {
      if (file === CONSOLIDATED) {
        console.log("");
        await runConsolidated(file, sql);
      } else {
        await pool.query(sql);
        console.log("ok");
      }
      await pool.query("INSERT INTO _migrations (name) VALUES ($1)", [file]);
      ran += 1;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const tolerate =
        process.env.MIGRATE_TOLERATE === "1" &&
        (/schema "auth" does not exist/i.test(message) ||
          /function auth\./i.test(message) ||
          /relation "auth\./i.test(message) ||
          /role ".*?" does not exist/i.test(message) ||
          /already exists/i.test(message) ||
          /duplicate key/i.test(message));
      if (tolerate) {
        await pool.query("INSERT INTO _migrations (name) VALUES ($1) ON CONFLICT DO NOTHING", [file]);
        console.log("TOLERATED:", message.slice(0, 120));
        ran += 1;
        continue;
      }
      console.log("FAIL");
      failed = { file, message };
      console.error(failed);
      break;
    }
  }
  const summary = {
    timestamp: new Date().toISOString(),
    database: url.replace(/:[^:@/]+@/, ":***@"),
    ran,
    skipped,
    totalFiles: files.length,
    failed,
    ok: !failed,
    splitter: "scripts/lib/splitSqlStatements.mjs",
  };
  const outDir = path.join(ROOT, "docs", "evidence", "os-saas-e2e");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "migrate_live_latest.json"), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
  await pool.end();
  process.exit(failed ? 1 : 0);
}

main().catch(async (e) => {
  console.error(e);
  await pool.end().catch(() => {});
  process.exit(1);
});
