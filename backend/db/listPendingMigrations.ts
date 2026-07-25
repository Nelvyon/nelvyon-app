/**
 * List SQL migration files not yet recorded in `_migrations`.
 * Read-only helper for migrate-prod governance gate.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { DbClient } from "./DbClient";
import { loadEnvFiles } from "./loadEnvFiles";

const here = path.dirname(fileURLToPath(import.meta.url));

export async function listPendingMigrations(): Promise<string[]> {
  loadEnvFiles();
  const db = DbClient.getInstance();
  await db.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      name text PRIMARY KEY,
      executed_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  const migrationsDir = path.join(here, "migrations");
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  const pending: string[] = [];
  for (const file of files) {
    const rows = await db.query<{ name: string }>("SELECT name FROM _migrations WHERE name = $1", [
      file,
    ]);
    if (rows.length === 0) pending.push(file);
  }
  await db.end();
  return pending;
}
