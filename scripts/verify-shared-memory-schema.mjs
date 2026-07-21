#!/usr/bin/env node
/**
 * Verify Shared Memory schema (514) + RLS (515) against a live DATABASE_URL.
 * Does NOT apply migrations. Safe read-only checks.
 *
 *   node scripts/verify-shared-memory-schema.mjs
 *   DATABASE_URL=... node scripts/verify-shared-memory-schema.mjs
 *
 * Exit 0 = all present; 2 = DATABASE_URL missing (preflight); 1 = schema gaps.
 */
import { spawnSync } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "backend/local-ai/benchmarks");
mkdirSync(outDir, { recursive: true });
const evidencePath = join(outDir, "shared_memory_schema_evidence.json");

const url = process.env.DATABASE_URL?.trim() || process.env.LOCAL_AI_DATABASE_URL?.trim();
if (!url) {
  const evidence = {
    generatedAt: new Date().toISOString(),
    ok: false,
    verified: false,
    blocker: "DATABASE_URL (or LOCAL_AI_DATABASE_URL) not set — cannot verify applied state",
    humanAction:
      "Set DATABASE_URL to staging/prod read URL (or local) then re-run. Apply: pnpm -C apps/web migrate",
  };
  writeFileSync(evidencePath, JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify(evidence, null, 2));
  process.exit(2);
}

const sql = `
SELECT
  to_regclass('public.saas_shared_memory_entries') IS NOT NULL AS entries_table,
  to_regclass('public.saas_shared_memory_audit') IS NOT NULL AS audit_table,
  EXISTS (SELECT 1 FROM _migrations WHERE name LIKE '514_%') AS mig_514_recorded,
  EXISTS (SELECT 1 FROM _migrations WHERE name LIKE '515_%') AS mig_515_recorded,
  COALESCE((SELECT relrowsecurity FROM pg_class WHERE relname = 'saas_shared_memory_entries'), false) AS entries_rls,
  COALESCE((SELECT relrowsecurity FROM pg_class WHERE relname = 'saas_shared_memory_audit'), false) AS audit_rls;
`;

// Prefer psql if available
const psql = spawnSync(
  "psql",
  [url, "-v", "ON_ERROR_STOP=1", "-t", "-A", "-F", ",", "-c", sql],
  { encoding: "utf8", shell: true, timeout: 20000 },
);

let row = null;
let method = "psql";
let methodError = null;
if (psql.status === 0 && psql.stdout.trim()) {
  const parts = psql.stdout.trim().split(",");
  row = {
    entries_table: parts[0] === "t",
    audit_table: parts[1] === "t",
    mig_514_recorded: parts[2] === "t",
    mig_515_recorded: parts[3] === "t",
    entries_rls: parts[4] === "t",
    audit_rls: parts[5] === "t",
  };
} else {
  methodError = (psql.stderr || psql.stdout || "").slice(0, 400);
  // Fallback: node-pg (Windows / CI without psql on PATH)
  try {
    const { createRequire } = await import("node:module");
    // Resolve pg from apps/web workspace (scripts/ has no local node_modules)
    const requireFromWeb = createRequire(join(root, "apps/web/package.json"));
    const pg = requireFromWeb("pg");
    const client = new pg.Client({ connectionString: url });
    await client.connect();
    try {
      const res = await client.query(sql);
      const r = res.rows[0];
      row = {
        entries_table: Boolean(r.entries_table),
        audit_table: Boolean(r.audit_table),
        mig_514_recorded: Boolean(r.mig_514_recorded),
        mig_515_recorded: Boolean(r.mig_515_recorded),
        entries_rls: Boolean(r.entries_rls),
        audit_rls: Boolean(r.audit_rls),
      };
      method = "node-pg";
    } finally {
      await client.end();
    }
  } catch (err) {
    method = "unavailable";
    methodError = `${methodError || ""}\nnode-pg: ${err instanceof Error ? err.message : String(err)}`.slice(0, 600);
  }
}

const evidence = {
  generatedAt: new Date().toISOString(),
  method,
  ok: false,
  verified: false,
  checks: row,
  psqlError: method === "psql" ? null : methodError,
  applyCommands: [
    "pnpm -C apps/web migrate",
    "node scripts/verify-shared-memory-schema.mjs",
  ],
  rollbackNote:
    "514/515 are additive IF NOT EXISTS / RLS policies. Rollback: DROP POLICY …; ALTER TABLE … DISABLE ROW LEVEL SECURITY; DROP TABLE only if empty and approved.",
};

if (row) {
  evidence.ok = Boolean(
    row.entries_table && row.audit_table && row.mig_514_recorded,
  );
  evidence.verified =
    evidence.ok && row.entries_rls && row.audit_rls && row.mig_515_recorded;
}

writeFileSync(evidencePath, JSON.stringify(evidence, null, 2));
console.log(JSON.stringify(evidence, null, 2));
process.exit(evidence.verified ? 0 : evidence.ok ? 0 : 1);
