#!/usr/bin/env node
/**
 * Production RAG prep verification (Option A) — NO canary / NO OpenAI.
 * Requires LOCAL_AI_DATABASE_URL (RLS role). Inserts ephemeral tenants, checks RLS, deletes.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const url = (process.env.LOCAL_AI_DATABASE_URL ?? "").trim();
if (!url) {
  console.error(JSON.stringify({ ok: false, error: "LOCAL_AI_DATABASE_URL required" }));
  process.exit(2);
}
if (/@(localhost|127\.0\.0\.1|\[::1\]|host\.docker\.internal)[:/]/i.test(url)) {
  console.error(JSON.stringify({ ok: false, error: "REFUSE_LOOPBACK" }));
  process.exit(2);
}

const client = new pg.Client({
  connectionString: url,
  ssl: process.env.PGSSL === "0" ? false : { rejectUnauthorized: false },
});

const tenantA = crypto.randomUUID();
const tenantB = crypto.randomUUID();
const checks = [];

function record(name, ok, detail) {
  checks.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} [prod-rag-prep] ${name}: ${detail}`);
}

try {
  await client.connect();
  const who = await client.query(`SELECT current_user AS u, current_setting('is_superuser') AS su`);
  record(
    "role_nonsuperuser",
    who.rows[0].u === "nelvyon_local_ai_app" && who.rows[0].su === "off",
    `user=${who.rows[0].u} superuser=${who.rows[0].su}`,
  );

  const tables = await client.query(
    `SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename LIKE 'local_ai_%' ORDER BY 1`,
  );
  const names = tables.rows.map((r) => r.tablename);
  const required = [
    "local_ai_memory",
    "local_ai_rag_chunks",
    "local_ai_rag_documents",
    "local_ai_audit",
  ];
  const missing = required.filter((t) => !names.includes(t));
  record("required_tables", missing.length === 0, missing.length ? missing.join(",") : names.join(","));

  const rls = await client.query(`
    SELECT c.relname, c.relrowsecurity, c.relforcerowsecurity
      FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
     WHERE n.nspname='public' AND c.relname IN ('local_ai_rag_chunks','local_ai_rag_documents','local_ai_memory')
  `);
  const allForced = rls.rows.every((r) => r.relrowsecurity && r.relforcerowsecurity);
  record("rls_force_on_core_tables", allForced, JSON.stringify(rls.rows));

  // Ephemeral docs for A/B isolation
  await client.query("BEGIN");
  await client.query(`SELECT set_config('app.tenant_id', $1, true)`, [tenantA]);
  const docA = await client.query(
    `INSERT INTO local_ai_rag_documents (tenant_id, source_id, title, checksum, status)
     VALUES ($1,$2,'prep-a',$3,'active') RETURNING id`,
    [tenantA, `prep/${tenantA}/a.md`, crypto.randomBytes(16).toString("hex")],
  );
  await client.query(
    `INSERT INTO local_ai_rag_chunks (tenant_id, document_id, source_id, chunk_index, content, checksum, status)
     VALUES ($1,$2,$3,0,'tenant A secret pricing 49 euros',$4,'active')`,
    [tenantA, docA.rows[0].id, `prep/${tenantA}/a.md`, crypto.randomBytes(16).toString("hex")],
  );
  await client.query("COMMIT");

  await client.query("BEGIN");
  await client.query(`SELECT set_config('app.tenant_id', $1, true)`, [tenantB]);
  const docB = await client.query(
    `INSERT INTO local_ai_rag_documents (tenant_id, source_id, title, checksum, status)
     VALUES ($1,$2,'prep-b',$3,'active') RETURNING id`,
    [tenantB, `prep/${tenantB}/b.md`, crypto.randomBytes(16).toString("hex")],
  );
  await client.query(
    `INSERT INTO local_ai_rag_chunks (tenant_id, document_id, source_id, chunk_index, content, checksum, status)
     VALUES ($1,$2,$3,0,'tenant B secret enterprise 999 euros',$4,'active')`,
    [tenantB, docB.rows[0].id, `prep/${tenantB}/b.md`, crypto.randomBytes(16).toString("hex")],
  );
  await client.query("COMMIT");

  await client.query("BEGIN");
  await client.query(`SELECT set_config('app.tenant_id', $1, true)`, [tenantA]);
  const leak = await client.query(
    `SELECT COUNT(*)::int AS n FROM local_ai_rag_chunks WHERE tenant_id = $1`,
    [tenantB],
  );
  await client.query("COMMIT");
  record("rls_a_cannot_count_b", leak.rows[0].n === 0, `cross_tenant_rows=${leak.rows[0].n}`);

  await client.query("BEGIN");
  await client.query(`SELECT set_config('app.tenant_id', $1, true)`, [tenantA]);
  const own = await client.query(
    `SELECT COUNT(*)::int AS n FROM local_ai_rag_chunks WHERE tenant_id = $1`,
    [tenantA],
  );
  await client.query("COMMIT");
  record("rls_a_reads_own", own.rows[0].n >= 1, `own_rows=${own.rows[0].n}`);

  const allOk = checks.every((c) => c.ok);
  const evidenceDir = path.join(root, "scripts/docs/evidence/os-saas-e2e/modules");
  fs.mkdirSync(evidenceDir, { recursive: true });
  const md = [
    "# Production RAG schema prep verification (Option A)",
    "",
    `| Campo | Valor |`,
    `|-------|-------|`,
    `| Fecha | ${new Date().toISOString()} |`,
    `| Role | nelvyon_local_ai_app |`,
    `| Canary/AI | NOT activated |`,
    `| OpenAI | OFF |`,
    `| Verdict | ${allOk ? "**PASS**" : "**FAIL**"} |`,
    "",
    "| Check | Result | Detail |",
    "|-------|--------|--------|",
    ...checks.map((c) => `| ${c.name} | ${c.ok ? "PASS" : "FAIL"} | ${c.detail.replace(/\|/g, "/")} |`),
    "",
  ].join("\n");
  fs.writeFileSync(path.join(evidenceDir, "railway.rag_prod_prep_latest.md"), md);
  console.log(allOk ? "PASS [prod-rag-prep]" : "FAIL [prod-rag-prep]");
  process.exit(allOk ? 0 : 1);
} catch (e) {
  console.error(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }));
  process.exit(1);
} finally {
  try {
    // Cleanup as admin is not available; delete under each tenant GUC
    for (const t of [tenantA, tenantB]) {
      await client.query("BEGIN");
      await client.query(`SELECT set_config('app.tenant_id', $1, true)`, [t]);
      await client.query(`DELETE FROM local_ai_rag_chunks WHERE tenant_id = $1`, [t]);
      await client.query(`DELETE FROM local_ai_rag_documents WHERE tenant_id = $1`, [t]);
      await client.query("COMMIT");
    }
  } catch {
    /* best effort */
  }
  try {
    await client.end();
  } catch {
    /* ignore */
  }
}
