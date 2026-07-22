#!/usr/bin/env node
/**
 * Gate: SQL migrations remain SSOT (ADR-002/039).
 * - Files 517/518 present
 * - FastAPI Dockerfile documents SKIP_ALEMBIC
 * - create_all duplicate swallow is strictly scoped (helper + tests)
 * - Optional: if DATABASE_URL set, assert _migrations contains 517/518
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];

function fail(msg) {
  failures.push(msg);
  console.error(`[sql-alembic-ssot] FAIL — ${msg}`);
}

function ok(msg) {
  console.log(`[sql-alembic-ssot] OK — ${msg}`);
}

const migDir = path.join(root, "backend/db/migrations");
const files = fs.readdirSync(migDir).filter((f) => f.endsWith(".sql"));
for (const prefix of ["517_", "518_"]) {
  if (!files.some((f) => f.startsWith(prefix))) fail(`missing migration ${prefix}*`);
  else ok(`migration ${prefix}* present`);
}

const dockerfile = fs.readFileSync(path.join(root, "backend/Dockerfile"), "utf8");
if (!dockerfile.includes("SKIP_ALEMBIC")) fail("backend/Dockerfile missing SKIP_ALEMBIC branch");
else ok("Dockerfile SKIP_ALEMBIC branch present");
if (!/alembic upgrade head \|\|/.test(dockerfile) && !dockerfile.includes('SKIP_ALEMBIC:-0')) {
  fail("Dockerfile must skip or non-fatally handle alembic on shared DB");
} else ok("Dockerfile alembic path is non-blocking when SKIP_ALEMBIC=1");

const dbPy = fs.readFileSync(path.join(root, "backend/core/database.py"), "utf8");
if (!dbPy.includes("def is_duplicate_table_error")) {
  fail("database.py missing is_duplicate_table_error helper");
} else ok("is_duplicate_table_error helper present");
if (!dbPy.includes("db.create_all_duplicate_ignored")) {
  fail("database.py missing structured log event db.create_all_duplicate_ignored");
} else ok("structured duplicate-ignored log present");

const guardTest = path.join(root, "backend/tests/test_create_all_duplicate_guard.py");
if (!fs.existsSync(guardTest)) fail("missing test_create_all_duplicate_guard.py");
else ok("duplicate-guard unit test present");

const databaseUrl = process.env.DATABASE_URL?.trim();
if (databaseUrl) {
  const client = new pg.Client({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes("localhost") ? undefined : { rejectUnauthorized: false },
  });
  try {
    await client.connect();
    const r = await client.query(
      "select name from _migrations where name like '517_%' or name like '518_%' order by 1",
    );
    const names = r.rows.map((row) => row.name);
    if (!names.some((n) => n.startsWith("517_"))) fail("_migrations missing 517_*");
    else ok(`_migrations has ${names.find((n) => n.startsWith("517_"))}`);
    if (!names.some((n) => n.startsWith("518_"))) fail("_migrations missing 518_*");
    else ok(`_migrations has ${names.find((n) => n.startsWith("518_"))}`);

    const cols = await client.query(
      `select column_name from information_schema.columns
       where table_schema='public' and table_name='workspaces' and column_name='timezone'`,
    );
    if (cols.rowCount < 1) fail("workspaces.timezone column missing");
    else ok("workspaces.timezone present");

    const wf = await client.query(
      `select column_name from information_schema.columns
       where table_schema='public' and table_name='workflows' and column_name='is_active'`,
    );
    if (wf.rowCount < 1) fail("workflows.is_active column missing");
    else ok("workflows.is_active present");
  } catch (e) {
    fail(`DATABASE_URL check error: ${String(e).slice(0, 200)}`);
  } finally {
    await client.end().catch(() => {});
  }
} else {
  console.log("[sql-alembic-ssot] SKIP DB probe (DATABASE_URL unset)");
}

if (failures.length) {
  console.error(`[sql-alembic-ssot] ${failures.length} failure(s)`);
  process.exit(1);
}
console.log("[sql-alembic-ssot] ALL_PASS");
