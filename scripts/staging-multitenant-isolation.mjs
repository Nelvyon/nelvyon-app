/**
 * Multi-tenant isolation proof on staging (marker contacts + JWT).
 * railway run --service ideal-victory --environment staging -- node scripts/staging-multitenant-isolation.mjs
 */
import { createHmac } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";

const BASE =
  process.env.STAGING_BASE_URL?.replace(/\/$/, "") || "https://ideal-victory-staging.up.railway.app";
const JWT_SECRET = process.env.JWT_SECRET || "";
const DATABASE_URL = process.env.DATABASE_URL || "";
const QA_EMAIL = process.env.STAGING_QA_EMAIL || "qa-audit-20260612@nelvyon.test";

function b64url(input) {
  return Buffer.from(input).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function mintToken(payload) {
  const now = Math.floor(Date.now() / 1000);
  const body = { ...payload, iat: now, exp: now + 3600 };
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const mid = b64url(JSON.stringify(body));
  const data = `${header}.${mid}`;
  const sig = createHmac("sha256", JWT_SECRET)
    .update(data)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  return `${data}.${sig}`;
}

async function api(path, { token, tenantId } = {}) {
  const headers = { Accept: "application/json" };
  if (token) headers.Cookie = `nelvyon_token=${token}`;
  if (tenantId) {
    headers["X-Nelvyon-Tenant-Id"] = tenantId;
    headers.Cookie = `${headers.Cookie || ""}; nelvyon_saas_tenant_id=${encodeURIComponent(tenantId)}`.replace(
      /^; /,
      "",
    );
  }
  const res = await fetch(`${BASE}${path}`, { headers, redirect: "manual" });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* ignore */
  }
  return { status: res.status, json };
}

const evidence = { base: BASE, startedAt: new Date().toISOString(), checks: [] };
const check = (name, ok, detail = {}) => {
  evidence.checks.push({ name, ok, ...detail });
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail.status != null ? ` status=${detail.status}` : ""}`);
};

if (!JWT_SECRET || !DATABASE_URL) {
  console.error("missing env");
  process.exit(1);
}

const client = new pg.Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });
await client.connect();
const cleanupEmails = [];
try {
  const u = await client.query(
    `SELECT user_id::text AS id, email, tenant_id::text AS tenant_id, plan
     FROM nelvyon_users WHERE email=$1 LIMIT 1`,
    [QA_EMAIL],
  );
  const user = u.rows[0];
  check("qa_user", Boolean(user));
  if (!user) throw new Error("qa missing");

  // Resolve tenants the QA user can actually access (workspace_members → saas_tenants)
  const accessible = await client.query(
    `SELECT st.id::text AS id, st.company_name, wm.role::text AS role
     FROM workspace_members wm
     JOIN saas_tenants st ON st.workspace_id = wm.workspace_id
     WHERE wm.user_id = $1::text AND wm.status = 'active'
     ORDER BY st.created_at DESC NULLS LAST
     LIMIT 10`,
    [user.id],
  );
  check("accessible_tenants_ge_1", accessible.rowCount >= 1, { count: accessible.rowCount });

  const allTenants = await client.query(
    `SELECT id::text AS id FROM saas_tenants WHERE onboarding_completed = true
     ORDER BY created_at DESC NULLS LAST LIMIT 20`,
  );

  const tA = accessible.rows[0]?.id;
  const tB = allTenants.rows.find((t) => !accessible.rows.some((a) => a.id === t.id))?.id;
  check("foreign_tenant_available", Boolean(tA && tB), {
    accessible: accessible.rowCount,
    all: allTenants.rowCount,
  });

  if (tA && tB) {
    const markerA = `iso-a-${Date.now()}@nelvyon.test`;
    const markerB = `iso-b-${Date.now()}@nelvyon.test`;
    cleanupEmails.push(markerA, markerB);

    await client.query(
      `INSERT INTO saas_contacts (tenant_id, name, email, status, pipeline_stage)
       VALUES ($1::uuid, 'ISO Tenant A', $2, 'lead', 'new')`,
      [tA, markerA],
    );
    await client.query(
      `INSERT INTO saas_contacts (tenant_id, name, email, status, pipeline_stage)
       VALUES ($1::uuid, 'ISO Tenant B', $2, 'lead', 'new')`,
      [tB, markerB],
    );

    const tokenA = mintToken({
      userId: user.id,
      email: user.email,
      tenantId: tA,
      plan: user.plan || "pro",
    });

    const own = await api("/api/saas/crm/contacts?pageSize=200", { token: tokenA, tenantId: tA });
    const cross = await api("/api/saas/crm/contacts?pageSize=200", { token: tokenA, tenantId: tB });

    const ownText = JSON.stringify(own.json || {});
    const crossText = JSON.stringify(cross.json || {});
    const ownHasA = ownText.includes(markerA);
    const ownHasB = ownText.includes(markerB);
    const crossHasB = crossText.includes(markerB);

    check("own_sees_marker_A", own.status === 200 && ownHasA && !ownHasB, {
      status: own.status,
      ownHasA,
      ownHasB,
    });

    // Current staging may soft-fallback (200 without B). After fail-closed deploy: 403.
    const isolated =
      cross.status === 403 ||
      cross.status === 401 ||
      (cross.status === 200 && !crossHasB);
    check("cross_tenant_no_leak", isolated, {
      status: cross.status,
      crossHasB,
    });
  }
} finally {
  if (cleanupEmails.length) {
    await client.query(`DELETE FROM saas_contacts WHERE email = ANY($1::text[])`, [cleanupEmails]).catch(() => {});
  }
  await client.end();
}

evidence.finishedAt = new Date().toISOString();
evidence.passed = evidence.checks.filter((c) => c.ok).length;
evidence.failed = evidence.checks.filter((c) => !c.ok).length;
evidence.verdict = evidence.failed === 0 ? "ISOLATION_PASS" : "ISOLATION_FAIL";
mkdirSync(join(process.cwd(), "docs/evidence"), { recursive: true });
const out = join(process.cwd(), "docs/evidence", `staging-isolation-${Date.now()}.json`);
writeFileSync(out, JSON.stringify(evidence, null, 2));
console.log(`verdict=${evidence.verdict} passed=${evidence.passed} failed=${evidence.failed}`);
console.log(`evidence=${out}`);
process.exit(evidence.failed === 0 ? 0 : 2);
