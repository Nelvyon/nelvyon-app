import fs from "fs";
import path from "path";

import { DbClient } from "./DbClient";
import { loadEnvFiles } from "./loadEnvFiles";

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
    await db.query(sql);
    await db.query("INSERT INTO _migrations (name) VALUES ($1)", [file]);
    console.log(`[migrate] done: ${file}`);
  }
  console.log("[migrate] all migrations complete");
  await db.end();
}

runMigrations()
  .then(() => {
    process.exit(0);
  })
  .catch((err: unknown) => {
    console.error("[migrate] FATAL:", err);
    process.exit(1);
  });
