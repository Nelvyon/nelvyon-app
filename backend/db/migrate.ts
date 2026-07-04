import fs from "fs";
import path from "path";

import { DbClient } from "./DbClient";
import { loadEnvFiles } from "./loadEnvFiles";
import { isTolerableConsolidatedMigrationError, splitSqlStatements } from "./splitSqlStatements";

const CONSOLIDATED_MIGRATION = "507_fastapi_runtime_schemas.sql";

async function runMigrations(): Promise<void> {
  loadEnvFiles();
  const db = DbClient.getInstance();
  await db.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      name text PRIMARY KEY,
      executed_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  const migrationsDir = path.join(__dirname, "migrations");
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  for (const file of files) {
    const rows = await db.query<{ name: string }>("SELECT name FROM _migrations WHERE name = $1", [file]);
    if (rows.length > 0) {
      console.log(`[migrate] skip: ${file}`);
      continue;
    }
    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
    console.log(`[migrate] run: ${file}`);
    if (file === CONSOLIDATED_MIGRATION) {
      await runConsolidatedMigration(db, file, sql);
    } else {
      await db.query(sql);
    }
    await db.query("INSERT INTO _migrations (name) VALUES ($1)", [file]);
    console.log(`[migrate] done: ${file}`);
  }
  console.log("[migrate] all migrations complete");
  await db.end();
}

async function runConsolidatedMigration(db: DbClient, file: string, sql: string): Promise<void> {
  const statements = splitSqlStatements(sql);
  let ok = 0;
  let warned = 0;
  for (const stmt of statements) {
    try {
      await db.query(stmt);
      ok += 1;
    } catch (err: unknown) {
      if (isTolerableConsolidatedMigrationError(err, stmt)) {
        warned += 1;
        const pg = err as { message?: string };
        console.warn(`[migrate] warn ${file}: ${pg.message ?? String(err)}`);
        continue;
      }
      throw err;
    }
  }
  console.log(`[migrate] ${file}: ${ok} statements ok, ${warned} warnings (legacy schema drift)`);
}

runMigrations()
  .then(() => {
    process.exit(0);
  })
  .catch((err: unknown) => {
    console.error("[migrate] FATAL:", err);
    process.exit(1);
  });
