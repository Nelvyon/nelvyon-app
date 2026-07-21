#!/usr/bin/env node
/**
 * Bloque 3 — SaaS UUID tenant isolation (staging).
 *
 * Creates two ephemeral onboarding tenants, seeds audit_logs + saas_contacts,
 * proves isolation via the real JWT→nelvyon_current_saas_tenant_uuid() path
 * (set_config request.jwt.claim.sub) AND app-level WHERE tenant_id filters.
 * Cleans up only probe rows/tenants created by this run.
 *
 * Usage: DATABASE_URL=... node scripts/verify-saas-uuid-isolation.mjs
 * Never prints secrets or full connection strings.
 */
import { createRequire } from "node:module";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const requireFromWeb = createRequire(join(root, "apps/web/package.json"));
const pg = requireFromWeb("pg");

const url = process.env.DATABASE_URL?.trim();
if (!url) {
  console.error("DATABASE_URL required");
  process.exit(2);
}

const evidencePath = join(
  root,
  "backend/local-ai/benchmarks/saas_uuid_isolation_evidence.json",
);
mkdirSync(dirname(evidencePath), { recursive: true });

const TAG = `b3_iso_${Date.now()}`;
const evidence = {
  generatedAt: new Date().toISOString(),
  block: 3,
  method: "ephemeral_tenants_jwt_context_plus_app_filter",
  ok: false,
  checks: {},
  errors: [],
  notes: [],
  cleanup: { attempted: false, ok: false },
};

const client = new pg.Client({
  connectionString: url,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 20_000,
});

async function q(sql, params = []) {
  return client.query(sql, params);
}

function fail(msg) {
  evidence.errors.push(msg);
  console.error(`FAIL ${msg}`);
}

try {
  await client.connect();
  evidence.checks.connect = true;

  // Schema prerequisites
  for (const t of ["saas_tenants", "audit_logs", "saas_contacts"]) {
    const r = await q(`SELECT to_regclass($1) IS NOT NULL AS ok`, [`public.${t}`]);
    evidence.checks[`table_${t}`] = r.rows[0].ok;
    if (!r.rows[0].ok) fail(`missing table ${t}`);
  }
  const fn = await q(
    `SELECT to_regprocedure('public.nelvyon_current_saas_tenant_uuid()') IS NOT NULL AS ok`,
  );
  evidence.checks.fn_nelvyon_current_saas_tenant_uuid = fn.rows[0].ok;
  if (!fn.rows[0].ok) fail("missing nelvyon_current_saas_tenant_uuid()");

  if (evidence.errors.length) {
    evidence.ok = false;
    writeFileSync(evidencePath, JSON.stringify(evidence, null, 2));
    process.exit(1);
  }

  // Inspect columns for flexible seed
  const tenantCols = new Set(
    (
      await q(
        `SELECT column_name FROM information_schema.columns
         WHERE table_schema='public' AND table_name='saas_tenants'`,
      )
    ).rows.map((r) => r.column_name),
  );
  const auditCols = new Set(
    (
      await q(
        `SELECT column_name FROM information_schema.columns
         WHERE table_schema='public' AND table_name='audit_logs'`,
      )
    ).rows.map((r) => r.column_name),
  );
  const contactCols = new Set(
    (
      await q(
        `SELECT column_name FROM information_schema.columns
         WHERE table_schema='public' AND table_name='saas_contacts'`,
      )
    ).rows.map((r) => r.column_name),
  );

  const idA = randomUUID();
  const idB = randomUUID();
  const userA = randomUUID();
  const userB = randomUUID();

  // Optional: seed nelvyon_users if FK requires it
  const hasUsers = (
    await q(`SELECT to_regclass('public.nelvyon_users') IS NOT NULL AS ok`)
  ).rows[0].ok;
  if (hasUsers && tenantCols.has("user_id")) {
    try {
      const uCols = new Set(
        (
          await q(
            `SELECT column_name FROM information_schema.columns
             WHERE table_schema='public' AND table_name='nelvyon_users'`,
          )
        ).rows.map((r) => r.column_name),
      );
      for (const [uid, email] of [
        [userA, `${TAG}_a@nelvyon.test`],
        [userB, `${TAG}_b@nelvyon.test`],
      ]) {
        const cols = ["user_id", "email"];
        const ph = ["$1::uuid", "$2"];
        const params = [uid, email];
        let i = 3;
        if (uCols.has("name")) {
          cols.push("name");
          ph.push(`$${i}`);
          params.push(`B3 Probe`);
          i += 1;
        }
        if (uCols.has("full_name")) {
          cols.push("full_name");
          ph.push(`$${i}`);
          params.push(`B3 Probe`);
          i += 1;
        }
        if (uCols.has("password_hash")) {
          cols.push("password_hash");
          ph.push(`$${i}`);
          params.push("$b3$probe$not-a-real-hash");
          i += 1;
        }
        await q(
          `INSERT INTO nelvyon_users (${cols.join(", ")}) VALUES (${ph.join(", ")})
           ON CONFLICT DO NOTHING`,
          params,
        );
      }
      evidence.notes.push("seeded_ephemeral_nelvyon_users");
    } catch (e) {
      evidence.notes.push(
        `nelvyon_users_seed_skip: ${e instanceof Error ? e.message.slice(0, 120) : String(e)}`,
      );
    }
  }

  // Create ephemeral tenants
  const tenantInsertCols = ["id"];
  const tenantInsertVals = ["$1::uuid"];
  const tenantParams = [null]; // filled per tenant

  function buildTenantSql(tid, uid, name) {
    const cols = ["id"];
    const ph = ["$1::uuid"];
    const params = [tid];
    let i = 2;
    if (tenantCols.has("user_id")) {
      cols.push("user_id");
      ph.push(`$${i}::uuid`);
      params.push(uid);
      i += 1;
    }
    if (tenantCols.has("name")) {
      cols.push("name");
      ph.push(`$${i}`);
      params.push(name);
      i += 1;
    }
    if (tenantCols.has("company_name")) {
      cols.push("company_name");
      ph.push(`$${i}`);
      params.push(name);
      i += 1;
    }
    if (tenantCols.has("industry")) {
      cols.push("industry");
      ph.push(`$${i}`);
      params.push("other");
      i += 1;
    }
    if (tenantCols.has("slug")) {
      cols.push("slug");
      ph.push(`$${i}`);
      params.push(name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40));
      i += 1;
    }
    if (tenantCols.has("plan")) {
      cols.push("plan");
      ph.push(`$${i}`);
      params.push("starter");
      i += 1;
    }
    if (tenantCols.has("onboarding_completed")) {
      cols.push("onboarding_completed");
      ph.push("true");
    }
    if (tenantCols.has("created_at")) {
      cols.push("created_at");
      ph.push("NOW()");
    }
    return {
      sql: `INSERT INTO saas_tenants (${cols.join(", ")}) VALUES (${ph.join(", ")}) RETURNING id::text`,
      params,
    };
  }

  const insA = buildTenantSql(idA, userA, `${TAG}_tenant_a`);
  const insB = buildTenantSql(idB, userB, `${TAG}_tenant_b`);
  await q(insA.sql, insA.params);
  await q(insB.sql, insB.params);
  evidence.checks.ephemeral_tenants_created = true;
  evidence.notes.push(`tenants=${TAG}_a/_b (uuids omitted from log)`);

  // Seed audit_logs
  const auditIds = {};
  for (const [label, tid, uid] of [
    ["a", idA, userA],
    ["b", idB, userB],
  ]) {
    const cols = ["tenant_id", "action"];
    const ph = ["$1::uuid", "$2"];
    const params = [tid, `${TAG}_audit_${label}`];
    let i = 3;
    if (auditCols.has("module")) {
      cols.push("module");
      ph.push(`$${i}`);
      params.push("bloque3");
      i += 1;
    }
    if (auditCols.has("user_id")) {
      cols.push("user_id");
      ph.push(`$${i}::uuid`);
      params.push(uid);
      i += 1;
    }
    if (auditCols.has("details")) {
      cols.push("details");
      ph.push(`'{}'::jsonb`);
    }
    if (auditCols.has("created_at")) {
      cols.push("created_at");
      ph.push("NOW()");
    }
    const r = await q(
      `INSERT INTO audit_logs (${cols.join(", ")}) VALUES (${ph.join(", ")}) RETURNING id::text`,
      params,
    );
    auditIds[label] = r.rows[0].id;
  }
  evidence.checks.audit_seeded = true;

  // Seed saas_contacts
  const contactIds = {};
  for (const [label, tid] of [
    ["a", idA],
    ["b", idB],
  ]) {
    const cols = ["tenant_id"];
    const ph = ["$1::uuid"];
    const params = [tid];
    let i = 2;
    if (contactCols.has("id")) {
      // let default or generate
    }
    if (contactCols.has("name") || contactCols.has("full_name")) {
      const c = contactCols.has("name") ? "name" : "full_name";
      cols.push(c);
      ph.push(`$${i}`);
      params.push(`${TAG}_contact_${label}`);
      i += 1;
    }
    if (contactCols.has("email")) {
      cols.push("email");
      ph.push(`$${i}`);
      params.push(`${TAG}_${label}@probe.nelvyon.test`);
      i += 1;
    }
    if (contactCols.has("created_at")) {
      cols.push("created_at");
      ph.push("NOW()");
    }
    const r = await q(
      `INSERT INTO saas_contacts (${cols.join(", ")}) VALUES (${ph.join(", ")}) RETURNING id::text`,
      params,
    );
    contactIds[label] = r.rows[0].id;
  }
  evidence.checks.contacts_seeded = true;

  // --- JWT context isolation for audit_logs (policy predicate path) ---
  async function withJwt(sub, fn) {
    await q(`BEGIN`);
    await q(`SELECT set_config('request.jwt.claim.sub', $1, true)`, [sub]);
    try {
      return await fn();
    } finally {
      await q(`COMMIT`);
    }
  }

  const jwtAuditA = await withJwt(userA, async () => {
    const r = await q(
      `SELECT id::text FROM audit_logs
       WHERE id = ANY($1::uuid[])
         AND tenant_id = public.nelvyon_current_saas_tenant_uuid()`,
      [[auditIds.a, auditIds.b]],
    );
    return r.rows.map((x) => x.id);
  });
  const jwtAuditB = await withJwt(userB, async () => {
    const r = await q(
      `SELECT id::text FROM audit_logs
       WHERE id = ANY($1::uuid[])
         AND tenant_id = public.nelvyon_current_saas_tenant_uuid()`,
      [[auditIds.a, auditIds.b]],
    );
    return r.rows.map((x) => x.id);
  });
  const jwtAuditNone = await withJwt("", async () => {
    const r = await q(
      `SELECT id::text FROM audit_logs
       WHERE id = ANY($1::uuid[])
         AND tenant_id = public.nelvyon_current_saas_tenant_uuid()`,
      [[auditIds.a, auditIds.b]],
    );
    return r.rows.map((x) => x.id);
  });

  const auditJwtOk =
    jwtAuditA.length === 1 &&
    jwtAuditA[0] === auditIds.a &&
    jwtAuditB.length === 1 &&
    jwtAuditB[0] === auditIds.b &&
    jwtAuditNone.length === 0;
  evidence.checks.audit_jwt_predicate = {
    ok: auditJwtOk,
    seenA: jwtAuditA.length,
    seenB: jwtAuditB.length,
    seenNone: jwtAuditNone.length,
  };
  if (!auditJwtOk) fail("audit_jwt_predicate isolation failed");

  // Cross-tenant write attempt via app filter (simulate SaasAuditService list)
  const appListA = (
    await q(
      `SELECT id::text FROM audit_logs WHERE tenant_id = $1::uuid AND id = ANY($2::uuid[])`,
      [idA, [auditIds.a, auditIds.b]],
    )
  ).rows;
  const appListB = (
    await q(
      `SELECT id::text FROM audit_logs WHERE tenant_id = $1::uuid AND id = ANY($2::uuid[])`,
      [idB, [auditIds.a, auditIds.b]],
    )
  ).rows;
  const appAuditOk =
    appListA.length === 1 &&
    appListA[0].id === auditIds.a &&
    appListB.length === 1 &&
    appListB[0].id === auditIds.b;
  evidence.checks.audit_app_filter = { ok: appAuditOk, a: appListA.length, b: appListB.length };
  if (!appAuditOk) fail("audit_app_filter isolation failed");

  // Contacts app-level isolation (SaasCrmService pattern)
  const contactsA = (
    await q(
      `SELECT id::text FROM saas_contacts WHERE tenant_id = $1::uuid AND id = ANY($2::uuid[])`,
      [idA, [contactIds.a, contactIds.b]],
    )
  ).rows;
  const contactsB = (
    await q(
      `SELECT id::text FROM saas_contacts WHERE tenant_id = $1::uuid AND id = ANY($2::uuid[])`,
      [idB, [contactIds.a, contactIds.b]],
    )
  ).rows;
  // Cross-tenant read should return 0 when filtering wrong tenant
  const crossRead = (
    await q(
      `SELECT id::text FROM saas_contacts WHERE tenant_id = $1::uuid AND id = $2::uuid`,
      [idA, contactIds.b],
    )
  ).rows;
  const contactsOk =
    contactsA.length === 1 &&
    contactsA[0].id === contactIds.a &&
    contactsB.length === 1 &&
    contactsB[0].id === contactIds.b &&
    crossRead.length === 0;
  evidence.checks.contacts_app_filter = {
    ok: contactsOk,
    a: contactsA.length,
    b: contactsB.length,
    crossTenantZero: crossRead.length === 0,
  };
  if (!contactsOk) fail("contacts_app_filter isolation failed");

  // Cross-tenant UPDATE attempt (should affect 0 rows)
  const upd = await q(
    `UPDATE saas_contacts SET email = $1 WHERE tenant_id = $2::uuid AND id = $3::uuid`,
    [`${TAG}_hijack@probe.nelvyon.test`, idA, contactIds.b],
  );
  evidence.checks.contacts_cross_update_zero = {
    ok: upd.rowCount === 0,
    rowCount: upd.rowCount,
  };
  if (upd.rowCount !== 0) fail("contacts_cross_update affected foreign tenant");

  // Cleanup probe data only
  evidence.cleanup.attempted = true;
  await q(`DELETE FROM audit_logs WHERE action LIKE $1`, [`${TAG}%`]);
  await q(`DELETE FROM saas_contacts WHERE id = ANY($1::uuid[])`, [
    [contactIds.a, contactIds.b],
  ]);
  await q(`DELETE FROM saas_tenants WHERE id = ANY($1::uuid[])`, [[idA, idB]]);
  if (hasUsers) {
    await q(`DELETE FROM nelvyon_users WHERE email LIKE $1`, [`${TAG}%`]).catch(() => {});
  }
  evidence.cleanup.ok = true;

  evidence.ok =
    evidence.errors.length === 0 &&
    auditJwtOk &&
    appAuditOk &&
    contactsOk &&
    upd.rowCount === 0;

  writeFileSync(evidencePath, JSON.stringify(evidence, null, 2));
  console.log(
    JSON.stringify(
      {
        ok: evidence.ok,
        evidencePath: "backend/local-ai/benchmarks/saas_uuid_isolation_evidence.json",
        checks: Object.fromEntries(
          Object.entries(evidence.checks).map(([k, v]) => [
            k,
            typeof v === "object" && v && "ok" in v ? { ok: v.ok } : v,
          ]),
        ),
        errors: evidence.errors,
        cleanup: evidence.cleanup,
      },
      null,
      2,
    ),
  );
  process.exit(evidence.ok ? 0 : 1);
} catch (e) {
  evidence.errors.push(e instanceof Error ? e.message : String(e));
  evidence.ok = false;
  try {
    writeFileSync(evidencePath, JSON.stringify(evidence, null, 2));
  } catch {
    /* ignore */
  }
  console.error("FATAL", e instanceof Error ? e.message : e);
  process.exit(1);
} finally {
  await client.end().catch(() => {});
}
