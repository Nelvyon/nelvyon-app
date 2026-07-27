#!/usr/bin/env node
/**
 * Create NOSUPERUSER / NOBYPASSRLS role with grants ONLY on local_ai_* tables.
 * Safe for shared SaaS DB — does NOT GRANT on CRM/ERP tables.
 *
 * Requires: DATABASE_URL (admin) + NELVYON_LOCAL_AI_RLS_ROLE_APPLY=1
 * Production: also NELVYON_PROD_LOCAL_AI_SCHEMA_APPROVED=1 + APPROVED_BY
 * Optional: NELVYON_LOCAL_AI_APP_PASSWORD (if unset, generated once on create)
 *
 * Writes URL to .tmp-local-ai-db-url.txt (gitignored) — never prints password.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

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

if (!isOne(process.env.NELVYON_LOCAL_AI_RLS_ROLE_APPLY)) {
  console.error(
    JSON.stringify({
      ok: false,
      blocked: true,
      reason: "NELVYON_LOCAL_AI_RLS_ROLE_APPLY must be exactly '1'",
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
        reason: "PRODUCTION: NELVYON_PROD_LOCAL_AI_SCHEMA_APPROVED=1 required",
      }),
    );
    process.exit(2);
  }
  if (!(process.env.NELVYON_PROD_LOCAL_AI_SCHEMA_APPROVED_BY ?? "").trim()) {
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

const adminUrl = (process.env.DATABASE_URL ?? "").trim();
if (!adminUrl) {
  console.error(JSON.stringify({ ok: false, reason: "DATABASE_URL required" }));
  process.exit(1);
}

const ROLE = "nelvyon_local_ai_app";
const password =
  (process.env.NELVYON_LOCAL_AI_APP_PASSWORD ?? "").trim() ||
  crypto.randomBytes(24).toString("base64url");

const client = new pg.Client({
  connectionString: adminUrl,
  ssl: process.env.PGSSL === "0" ? false : { rejectUnauthorized: false },
});

await client.connect();
try {
  const exists = await client.query(`SELECT 1 FROM pg_roles WHERE rolname = $1`, [ROLE]);
  // PASSWORD cannot use bind params in CREATE/ALTER ROLE on Postgres.
  const pwdLiteral = password.replace(/'/g, "''");
  if (exists.rowCount === 0) {
    await client.query(
      `CREATE ROLE ${ROLE} LOGIN PASSWORD '${pwdLiteral}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS`,
    );
  } else if ((process.env.NELVYON_LOCAL_AI_APP_PASSWORD ?? "").trim()) {
    await client.query(`ALTER ROLE ${ROLE} WITH PASSWORD '${pwdLiteral}'`);
  }

  const dbName = (await client.query("SELECT current_database() AS d")).rows[0].d;
  try {
    await client.query(`GRANT CONNECT ON DATABASE "${dbName}" TO ${ROLE}`);
  } catch {
    /* may already have connect */
  }
  await client.query(`GRANT USAGE ON SCHEMA public TO ${ROLE}`);

  const tables = (
    await client.query(
      `SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename LIKE 'local_ai%'`,
    )
  ).rows.map((r) => r.tablename);

  for (const t of tables) {
    await client.query(
      `GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public."${t}" TO ${ROLE}`,
    );
  }

  const attrs = await client.query(
    `SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = $1`,
    [ROLE],
  );

  const u = new URL(adminUrl);
  u.username = ROLE;
  u.password = password;

  const outPath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../.tmp-local-ai-db-url.txt",
  );
  fs.writeFileSync(outPath, u.toString(), { mode: 0o600 });

  console.log(
    JSON.stringify(
      {
        ok: true,
        environment: isProductionEnv() ? "production" : "non-production",
        role: ROLE,
        tablesGranted: tables,
        rolsuper: attrs.rows[0]?.rolsuper === true,
        rolbypassrls: attrs.rows[0]?.rolbypassrls === true,
        urlFile: outPath,
        note: "Set LOCAL_AI_DATABASE_URL from urlFile via railway CLI; delete file; never commit",
      },
      null,
      2,
    ),
  );
} finally {
  await client.end();
}
