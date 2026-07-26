#!/usr/bin/env node
/**
 * Apply local_ai_* schema (pgvector RAG) — PREPARED_OFF until flags set.
 *
 * Requires:
 *   NELVYON_LOCAL_AI_SCHEMA_APPLY=1
 *   LOCAL_AI_DATABASE_URL  OR  (DATABASE_URL + NELVYON_LOCAL_AI_USE_MAIN_DB=1)
 *
 * Usage (staging CEO window only):
 *   railway run -e staging -s ideal-victory -- \
 *     env NELVYON_LOCAL_AI_SCHEMA_APPLY=1 NELVYON_LOCAL_AI_USE_MAIN_DB=1 \
 *     node scripts/apply-local-ai-schema.mjs
 *
 * Does NOT enable OpenAI. Does NOT flip prod canary. Rollback: DROP tables only via PITR/runbook.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function isOne(v) {
  return String(v ?? "").trim() === "1";
}

if (!isOne(process.env.NELVYON_LOCAL_AI_SCHEMA_APPLY)) {
  console.error(
    JSON.stringify({
      ok: false,
      blocked: true,
      reason: "NELVYON_LOCAL_AI_SCHEMA_APPLY must be exactly '1'",
      status: "PREPARED_OFF",
    }),
  );
  process.exit(2);
}

const dedicated = (process.env.LOCAL_AI_DATABASE_URL ?? "").trim();
const main = (process.env.DATABASE_URL ?? "").trim();
const useMain = isOne(process.env.NELVYON_LOCAL_AI_USE_MAIN_DB);
const url = dedicated || (useMain ? main : "");
if (!url) {
  console.error(
    JSON.stringify({
      ok: false,
      blocked: true,
      reason:
        "Need LOCAL_AI_DATABASE_URL or DATABASE_URL+NELVYON_LOCAL_AI_USE_MAIN_DB=1",
    }),
  );
  process.exit(2);
}

const sqlPath = path.join(root, "backend/local-ai/migrations/001_local_ai_base.sql");
const sql = fs.readFileSync(sqlPath, "utf8");

const client = new pg.Client({
  connectionString: url,
  ssl: process.env.PGSSL === "0" ? false : { rejectUnauthorized: false },
});

try {
  await client.connect();
  await client.query(sql);
  const tables = await client.query(`
    SELECT table_name FROM information_schema.tables
     WHERE table_schema='public'
       AND table_name LIKE 'local_ai_%'
     ORDER BY table_name`);
  const ext = await client.query(
    `SELECT extname, extversion FROM pg_extension WHERE extname='vector'`,
  );
  console.log(
    JSON.stringify(
      {
        ok: true,
        source: dedicated ? "LOCAL_AI_DATABASE_URL" : "DATABASE_URL",
        vector: ext.rows,
        tables: tables.rows.map((r) => r.table_name),
        next: "Unset NELVYON_LOCAL_AI_SCHEMA_APPLY; run staging-smoke-pgvector-rag-e2e against this DB",
      },
      null,
      2,
    ),
  );
  await client.end();
} catch (err) {
  console.error(
    JSON.stringify({
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    }),
  );
  try {
    await client.end();
  } catch {
    /* ignore */
  }
  process.exit(1);
}
