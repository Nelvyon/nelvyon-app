#!/usr/bin/env node
/**
 * Create NOSUPERUSER / NOBYPASSRLS role with grants ONLY on local_ai_* tables.
 * Safe for shared staging SaaS DB — does NOT GRANT on CRM/ERP tables.
 *
 * Requires: DATABASE_URL (admin) + NELVYON_LOCAL_AI_RLS_ROLE_APPLY=1
 * Optional: NELVYON_LOCAL_AI_APP_PASSWORD (if unset, generated once on create)
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

function isOne(v) {
  return String(v ?? "").trim() === "1";
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
  if (exists.rowCount === 0) {
    await client.query(
      `CREATE ROLE ${ROLE} LOGIN PASSWORD $1 NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS`,
      [password],
    );
  } else if ((process.env.NELVYON_LOCAL_AI_APP_PASSWORD ?? "").trim()) {
    // Only rotate when password explicitly provided (Supabase may block ALTER attributes).
    await client.query(`ALTER ROLE ${ROLE} WITH PASSWORD $1`, [password]);
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

  // Write URL to a gitignored local file for ops set — never commit.
  const outPath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../.tmp-local-ai-db-url.txt",
  );
  fs.writeFileSync(outPath, u.toString(), { mode: 0o600 });

  console.log(
    JSON.stringify(
      {
        ok: true,
        role: ROLE,
        tablesGranted: tables,
        rolsuper: attrs.rows[0]?.rolsuper === true,
        rolbypassrls: attrs.rows[0]?.rolbypassrls === true,
        urlFile: outPath,
        note: "railway variables set LOCAL_AI_DATABASE_URL=$(cat .tmp-local-ai-db-url.txt); then delete file",
      },
      null,
      2,
    ),
  );
} finally {
  await client.end();
}
