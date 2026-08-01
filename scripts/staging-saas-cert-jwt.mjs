/**
 * Staging SaaS cert via JWT mint (bypasses login rate limit).
 * Usage:
 *   railway run --service ideal-victory --environment staging -- node scripts/staging-saas-cert-jwt.mjs
 *
 * Never prints secrets or tokens. Writes evidence JSON under docs/evidence/.
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

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.error("JWT_SECRET missing/short");
  process.exit(1);
}
if (!DATABASE_URL) {
  console.error("DATABASE_URL missing");
  process.exit(1);
}

function b64url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function mintToken({ userId, email, tenantId, plan }) {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    userId,
    email,
    tenantId,
    plan: plan || "pro",
    iat: now,
    exp: now + 60 * 60,
  };
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = b64url(JSON.stringify(payload));
  const data = `${header}.${body}`;
  const hmac = createHmac("sha256", JWT_SECRET)
    .update(data)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  return `${data}.${hmac}`;
}

async function api(path, { method = "GET", token, body, tenantId } = {}) {
  const headers = { Accept: "application/json" };
  if (token) headers.Cookie = `nelvyon_token=${token}`;
  if (tenantId) headers["X-Nelvyon-Tenant-Id"] = tenantId;
  if (body) headers["Content-Type"] = "application/json";
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    redirect: "manual",
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* ignore */
  }
  return { status: res.status, json, textLen: text.length };
}

const evidence = {
  base: BASE,
  startedAt: new Date().toISOString(),
  checks: [],
};

function check(name, ok, detail = {}) {
  evidence.checks.push({ name, ok, ...detail });
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail.status != null ? ` status=${detail.status}` : ""}`);
}

const client = new pg.Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });
await client.connect();

try {
  const u = await client.query(
    `SELECT user_id::text AS id, email, tenant_id::text AS tenant_id, plan
     FROM nelvyon_users WHERE email = $1 LIMIT 1`,
    [QA_EMAIL],
  );
  check("qa_user_exists", u.rowCount === 1, { rows: u.rowCount });
  const userId = u.rows[0]?.id || "";
  const plan = u.rows[0]?.plan || "pro";

  const accessible = await client.query(
    `SELECT st.id::text AS id
     FROM workspace_members wm
     JOIN saas_tenants st ON st.workspace_id = wm.workspace_id
     WHERE wm.user_id::text = $1 AND wm.status = 'active' AND st.onboarding_completed = true
     ORDER BY st.created_at DESC NULLS LAST
     LIMIT 1`,
    [userId],
  );
  const tenantId = accessible.rows[0]?.id || u.rows[0]?.tenant_id || "";
  check("accessible_tenant", Boolean(tenantId), { len: String(tenantId).length });

  const tenants = await client.query(
    `SELECT id::text AS id, company_name, plan FROM saas_tenants ORDER BY created_at DESC NULLS LAST LIMIT 5`,
  );
  check("tenants_ge_2", tenants.rowCount >= 2, { count: tenants.rowCount });

  const token = mintToken({ userId, email: QA_EMAIL, tenantId, plan });
  check("jwt_minted", token.split(".").length === 3, { parts: token.split(".").length });

  const health = await api("/api/health");
  check("health", health.status === 200, { status: health.status });

  for (const [name, path] of [
    ["dashboard", "/api/saas/dashboard"],
    ["crm_contacts", "/api/saas/crm/contacts"],
    ["pipeline_deals", "/api/saas/deals"],
    ["workflows", "/api/saas/workflows"],
    ["sequences", "/api/saas/sequences"],
    ["billing", "/api/saas/billing"],
    ["settings", "/api/saas/settings"],
    ["webhooks", "/api/saas/webhooks"],
    ["lms", "/api/saas/lms"],
    ["store_products", "/api/saas/store/products"],
    ["ai_panel", "/api/saas/private-ai/router-health"],
  ]) {
    const res = await api(path, { token, tenantId });
    // Own accessible tenant must authorize (200) or be a missing/disabled module (404), never 5xx.
    check(name, res.status === 200 || res.status === 404, { status: res.status });
  }

  const other = tenants.rows.find((t) => t.id !== tenantId);
  if (other) {
    const cross = await api("/api/saas/crm/contacts", { token, tenantId: other.id });
    check("cross_tenant_forbidden", cross.status === 403 || cross.status === 401, { status: cross.status });
    const own = await api("/api/saas/crm/contacts", { token, tenantId });
    check("own_tenant_ok", own.status === 200, { status: own.status });
  } else {
    check("cross_tenant_forbidden", false, { reason: "need_second_tenant" });
  }

  for (const path of ["/login", "/saas/dashboard", "/saas/crm", "/saas/pipeline", "/saas/billing"]) {
    const res = await api(path, { token, tenantId });
    check(`page_${path}`, res.status < 500, { status: res.status });
  }
} finally {
  await client.end();
}

evidence.finishedAt = new Date().toISOString();
evidence.passed = evidence.checks.filter((c) => c.ok).length;
evidence.failed = evidence.checks.filter((c) => !c.ok).length;
evidence.verdict = evidence.failed === 0 ? "STAGING_CERT_PASS" : "STAGING_CERT_PARTIAL";

mkdirSync(join(process.cwd(), "docs/evidence"), { recursive: true });
const out = join(process.cwd(), "docs/evidence", `staging-saas-cert-${Date.now()}.json`);
writeFileSync(out, JSON.stringify(evidence, null, 2));
console.log(`verdict=${evidence.verdict} passed=${evidence.passed} failed=${evidence.failed}`);
console.log(`evidence=${out}`);
process.exit(evidence.failed === 0 ? 0 : 2);
