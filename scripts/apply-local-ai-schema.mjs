#!/usr/bin/env node
/**
 * Apply local_ai_* schema (pgvector RAG) — fail-closed until flags set.
 *
 * Requires:
 *   NELVYON_LOCAL_AI_SCHEMA_APPLY=1
 *   LOCAL_AI_DATABASE_URL  OR  (DATABASE_URL + NELVYON_LOCAL_AI_USE_MAIN_DB=1)
 *
 * Production (ADR-069 Option A prep) additionally requires:
 *   NELVYON_PROD_LOCAL_AI_SCHEMA_APPROVED=1
 *   NELVYON_PROD_LOCAL_AI_SCHEMA_APPROVED_BY=<ceo>
 *
 * Does NOT enable OpenAI / canary / MCP / SM / OpenClaw.
 * Unset SCHEMA_APPLY (+ prod approval) immediately after apply.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function isOne(v) {
  return String(v ?? "").trim() === "1";
}

function isProductionEnv(env = process.env) {
  const explicit = (env.NELVYON_DEPLOY_ENV ?? "").trim().toLowerCase();
  if (explicit === "production" || explicit === "prod") return true;
  if (
    explicit === "staging" ||
    explicit === "development" ||
    explicit === "dev" ||
    explicit === "test"
  ) {
    return false;
  }
  const railway = (env.RAILWAY_ENVIRONMENT_NAME ?? env.RAILWAY_ENVIRONMENT ?? "")
    .trim()
    .toLowerCase();
  if (railway === "production" || railway === "prod") return true;
  if (railway) return false;
  return (env.NODE_ENV ?? "").trim().toLowerCase() === "production";
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

if (isProductionEnv()) {
  if (!isOne(process.env.NELVYON_PROD_LOCAL_AI_SCHEMA_APPROVED)) {
    console.error(
      JSON.stringify({
        ok: false,
        blocked: true,
        reason:
          "PRODUCTION: set NELVYON_PROD_LOCAL_AI_SCHEMA_APPROVED=1 (CEO Option A window only)",
      }),
    );
    process.exit(2);
  }
  const by = (process.env.NELVYON_PROD_LOCAL_AI_SCHEMA_APPROVED_BY ?? "").trim();
  if (!by) {
    console.error(
      JSON.stringify({
        ok: false,
        blocked: true,
        reason: "PRODUCTION: NELVYON_PROD_LOCAL_AI_SCHEMA_APPROVED_BY required",
      }),
    );
    process.exit(2);
  }
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

if (isProductionEnv() && /@(localhost|127\.0\.0\.1|\[::1\]|host\.docker\.internal)[:/]/i.test(url)) {
  console.error(
    JSON.stringify({
      ok: false,
      blocked: true,
      reason: "PRODUCTION: refusing localhost/loopback database URL (ADR-069)",
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
  const rls = await client.query(`
    SELECT c.relname AS table_name, c.relrowsecurity, c.relforcerowsecurity
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relname LIKE 'local_ai_%'
     ORDER BY 1`);
  console.log(
    JSON.stringify(
      {
        ok: true,
        environment: isProductionEnv() ? "production" : "non-production",
        source: dedicated ? "LOCAL_AI_DATABASE_URL" : "DATABASE_URL",
        vector: ext.rows,
        tables: tables.rows.map((r) => r.table_name),
        rls: rls.rows,
        next: "Unset NELVYON_LOCAL_AI_SCHEMA_APPLY (+ prod approval vars); apply RLS role; keep canary/AI OFF",
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
