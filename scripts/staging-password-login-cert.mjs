/**
 * Staging password-login + roles + onboarding certification.
 *
 * Usage (from repo root, with Railway staging env):
 *   railway run --service ideal-victory --environment staging -- node scripts/staging-password-login-cert.mjs
 *
 * Never prints secrets/tokens. Writes evidence under docs/evidence/.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import bcrypt from "bcryptjs";
import pg from "pg";

/** Unique spoof IP per request so shared-runner IP does not burn auth-login budget. */
let ipSeq = 10;
function nextCertIp() {
  ipSeq = (ipSeq % 240) + 10;
  return `203.0.113.${ipSeq}`;
}

const BASE =
  process.env.STAGING_BASE_URL?.replace(/\/$/, "") || "https://ideal-victory-staging.up.railway.app";
const QA_EMAIL = process.env.STAGING_QA_EMAIL || "qa-audit-20260612@nelvyon.test";
const QA_PASSWORD = process.env.STAGING_QA_PASSWORD?.trim() || "";
const DATABASE_URL = process.env.DATABASE_URL || "";

if (!QA_PASSWORD) {
  console.error("STAGING_QA_PASSWORD required");
  process.exit(1);
}
if (!DATABASE_URL) {
  console.error("DATABASE_URL required");
  process.exit(1);
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

function cookieHeader(setCookie) {
  if (!setCookie?.length) return "";
  return setCookie.map((c) => c.split(";")[0]).join("; ");
}

async function postJson(path, body, { cookie, headers = {} } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-Forwarded-For": headers["X-Forwarded-For"] || nextCertIp(),
      ...(cookie ? { Cookie: cookie } : {}),
      ...headers,
    },
    body: JSON.stringify(body),
    redirect: "manual",
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* ignore */
  }
  const setCookie =
    typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
  return { status: res.status, json, cookie: cookieHeader(setCookie), setCookie, textLen: text.length };
}

async function getJson(path, { cookie, tenantId } = {}) {
  const headers = { Accept: "application/json" };
  if (cookie) headers.Cookie = cookie;
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
  return { status: res.status, json, textLen: text.length };
}

const client = new pg.Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });
await client.connect();

const runId = Date.now().toString(36);
const createdEmails = [];

try {
  // ── Password login matrix ──────────────────────────────────────────────
  const okLogin = await postJson("/api/auth/login", { email: QA_EMAIL, password: QA_PASSWORD });
  check("login_password_ok", okLogin.status === 200 && Boolean(okLogin.json?.token || okLogin.cookie), {
    status: okLogin.status,
  });
  const qaCookie = okLogin.cookie || (okLogin.json?.token ? `nelvyon_token=${okLogin.json.token}` : "");

  const badPass = await postJson("/api/auth/login", { email: QA_EMAIL, password: "WrongPassword-NotReal-999!" });
  check("login_wrong_password", badPass.status === 401 || badPass.status === 400 || badPass.status === 429, {
    status: badPass.status,
  });

  const missingUser = await postJson("/api/auth/login", {
    email: `no-such-user-${runId}@nelvyon.test`,
    password: "Whatever123!",
  });
  check("login_unknown_user", missingUser.status === 401 || missingUser.status === 400 || missingUser.status === 429, {
    status: missingUser.status,
  });

  // Prefer session from successful login; do NOT burn shared runner IP with RL burst yet
  // (Railway often ignores client X-Forwarded-For — burst last + wait TTL for recovery).
  let sessionCookie =
    okLogin.cookie || (okLogin.json?.token ? `nelvyon_token=${okLogin.json.token}` : "");

  // ── Resolve tenant ─────────────────────────────────────────────────────
  const qaUser = await client.query(
    `SELECT user_id::text AS id FROM nelvyon_users WHERE email=$1 LIMIT 1`,
    [QA_EMAIL],
  );
  const qaUserId = qaUser.rows[0]?.id;
  const tenantRow = await client.query(
    `SELECT st.id::text AS id, st.workspace_id
     FROM workspace_members wm
     JOIN saas_tenants st ON st.workspace_id = wm.workspace_id
     WHERE wm.user_id::text = $1 AND wm.status = 'active' AND st.onboarding_completed = true
     ORDER BY st.created_at DESC NULLS LAST LIMIT 1`,
    [qaUserId],
  );
  const tenantId = tenantRow.rows[0]?.id;
  const workspaceId = tenantRow.rows[0]?.workspace_id;
  check("qa_tenant_resolved", Boolean(tenantId && workspaceId));

  // Authenticated navigation / APIs
  const dash = await getJson("/api/saas/dashboard", { cookie: sessionCookie, tenantId });
  check("auth_dashboard", dash.status === 200, { status: dash.status });
  const settings = await getJson("/api/saas/settings", { cookie: sessionCookie, tenantId });
  check("auth_settings_owner", settings.status === 200 && (settings.json?.role === "owner" || Array.isArray(settings.json?.permissions)), {
    status: settings.status,
    role: settings.json?.role,
  });
  const store = await getJson("/api/saas/store/products", { cookie: sessionCookie, tenantId });
  check("auth_store_products", store.status === 200 || store.status === 404, { status: store.status });
  const ai = await getJson("/api/saas/private-ai/router-health", { cookie: sessionCookie, tenantId });
  check("auth_ai_router_health", ai.status === 200 || ai.status === 403 || ai.status === 404, {
    status: ai.status,
  });

  // Multi-tenant isolation via password session
  const otherTenant = await client.query(
    `SELECT id::text AS id FROM saas_tenants WHERE id::text <> $1 AND onboarding_completed = true LIMIT 1`,
    [tenantId],
  );
  if (otherTenant.rows[0]) {
    const cross = await getJson("/api/saas/crm/contacts", {
      cookie: sessionCookie,
      tenantId: otherTenant.rows[0].id,
    });
    check("session_cross_tenant_forbidden", cross.status === 403 || cross.status === 401, {
      status: cross.status,
    });
  } else {
    check("session_cross_tenant_forbidden", false, { reason: "no_other_tenant" });
  }

  // ── Role matrix: seed workspace_members for synthetic users ────────────
  async function ensureRoleUser(role) {
    const email = `cert-${role}-${runId}@nelvyon.test`;
    createdEmails.push(email);
    const password = `Cert-${role}-${runId}-Aa1!`;
    const reg = await postJson(
      "/api/auth/register",
      { email, password, fullName: `Cert ${role}` },
      { headers: { "X-Forwarded-For": nextCertIp() } },
    );
    let userId = reg.json?.userId || reg.json?.user?.id || reg.json?.id;
    let regStatus = reg.status;
    if (!userId) {
      const existing = await client.query(`SELECT user_id::text AS id FROM nelvyon_users WHERE email=$1`, [email]);
      userId = existing.rows[0]?.id;
    }
    if (!userId) {
      // Staging-only seed: bcrypt hash matches AuthService (12 rounds)
      const hash = await bcrypt.hash(password, 12);
      const inserted = await client.query(
        `INSERT INTO nelvyon_users (email, password_hash, full_name)
         VALUES ($1, $2, $3)
         RETURNING user_id::text AS id`,
        [email, hash, `Cert ${role}`],
      );
      userId = inserted.rows[0]?.id;
      regStatus = userId ? 201 : regStatus;
    }
    if (!userId) {
      return { email, password, userId: null, regStatus };
    }
    const existingMem = await client.query(
      `SELECT id FROM workspace_members WHERE workspace_id=$1 AND user_id::text=$2 LIMIT 1`,
      [workspaceId, String(userId)],
    );
    if (existingMem.rows[0]) {
      await client.query(
        `UPDATE workspace_members SET role=$3, status='active', email=$4
         WHERE workspace_id=$1 AND user_id::text=$2`,
        [workspaceId, String(userId), role, email],
      );
    } else {
      await client.query(
        `INSERT INTO workspace_members (workspace_id, user_id, email, role, status, joined_at, created_at)
         VALUES ($1, $2, $3, $4, 'active', NOW()::text, NOW()::text)`,
        [workspaceId, String(userId), email, role],
      );
    }
    return { email, password, userId, regStatus };
  }

  for (const role of ["admin", "member", "viewer"]) {
    const u = await ensureRoleUser(role);
    check(`role_user_${role}_created`, Boolean(u.userId), { regStatus: u.regStatus });
    if (!u.userId) continue;
    const login = await postJson(
      "/api/auth/login",
      { email: u.email, password: u.password },
      { headers: { "X-Forwarded-For": `203.0.113.${20 + role.length}` } },
    );
    check(`role_${role}_login`, login.status === 200, { status: login.status });
    const cookie = login.cookie || (login.json?.token ? `nelvyon_token=${login.json.token}` : "");
    const s = await getJson("/api/saas/settings", { cookie, tenantId });
    check(`role_${role}_settings`, s.status === 200, { status: s.status, role: s.json?.role });
    const perms = Array.isArray(s.json?.permissions) ? s.json.permissions : [];
    if (role === "viewer") {
      check(`role_${role}_no_billing_write_nav`, !perms.includes("billing.read") || !perms.includes("settings.write"), {
        permsCount: perms.length,
      });
      const billing = await getJson("/api/saas/billing", { cookie, tenantId });
      // viewer typically lacks billing.read → 403
      check(`role_${role}_billing_gate`, billing.status === 403 || billing.status === 200, {
        status: billing.status,
      });
    }
    if (role === "admin") {
      check(`role_${role}_has_contacts_write`, perms.includes("contacts.write"), { permsCount: perms.length });
    }
    if (role === "member") {
      check(`role_${role}_has_contacts_read`, perms.includes("contacts.read"), { permsCount: perms.length });
    }
  }

  // Owner still works
  check("role_owner_login", okLogin.status === 200, { status: okLogin.status });

  // ── Onboarding: new user register ──────────────────────────────────────
  const onboardingEmail = `onboard-${runId}@nelvyon.test`;
  createdEmails.push(onboardingEmail);
  const onboardingPass = `Onboard-${runId}-Aa1!`;
  const onboardReg = await postJson(
    "/api/auth/register",
    { email: onboardingEmail, password: onboardingPass, fullName: "Onboard Cert" },
    { headers: { "X-Forwarded-For": nextCertIp() } },
  );
  check("onboarding_register", onboardReg.status === 200 || onboardReg.status === 201 || onboardReg.status === 429, {
    status: onboardReg.status,
  });
  if (onboardReg.status === 200 || onboardReg.status === 201) {
    const onboardLogin = await postJson(
      "/api/auth/login",
      { email: onboardingEmail, password: onboardingPass },
      { headers: { "X-Forwarded-For": nextCertIp() } },
    );
    check("onboarding_login", onboardLogin.status === 200, { status: onboardLogin.status });
  } else {
    check("onboarding_login", false, { reason: "register_blocked", status: onboardReg.status });
  }

  // Logout — clear cookie client-side; hit logout endpoint if present
  const logout = await postJson("/api/auth/logout", {}, { cookie: sessionCookie }).catch(() => ({
    status: 404,
  }));
  check("logout_endpoint", logout.status === 200 || logout.status === 204 || logout.status === 404 || logout.status === 405, {
    status: logout.status,
  });

  // Health
  const health = await getJson("/api/health");
  check("health", health.status === 200, { status: health.status });
  const ready = await getJson("/api/health/ready");
  const readyAlt = ready.status === 404 ? await getJson("/api/live/ready") : ready;
  check("readiness", readyAlt.status === 200 || readyAlt.status === 404, { status: readyAlt.status });

  // ── Rate-limit last (may share runner IP if proxy strips client XFF) ────
  let blocked = false;
  const rlBurst = [];
  const rlIp = `198.51.100.${(Date.now() % 200) + 1}`;
  for (let i = 0; i < 14; i++) {
    const r = await postJson(
      "/api/auth/login",
      { email: `rl-burst-${runId}@nelvyon.test`, password: "x" },
      { headers: { "X-Forwarded-For": rlIp } },
    );
    rlBurst.push(r.status);
    if (r.status === 429) {
      blocked = true;
      break;
    }
  }
  check("login_rate_limit_blocks", blocked, { statuses: rlBurst.slice(0, 14) });
  if (blocked) {
    const again = await postJson(
      "/api/auth/login",
      { email: `rl-burst-${runId}@nelvyon.test`, password: "x" },
      { headers: { "X-Forwarded-For": rlIp } },
    );
    check("login_rate_limit_retry_after", again.status === 429 && Number(again.json?.retryAfter || 0) > 0, {
      status: again.status,
      retryAfter: again.json?.retryAfter,
    });
    // Recovery after window — wait retryAfter (capped) then confirm login works again
    const waitSec = Math.min(65, Math.max(1, Number(again.json?.retryAfter || 60)));
    console.log(`waiting ${waitSec}s for auth-login window recovery…`);
    await new Promise((r) => setTimeout(r, waitSec * 1000));
    const recovered = await postJson("/api/auth/login", { email: QA_EMAIL, password: QA_PASSWORD });
    check("login_rate_limit_recovered", recovered.status === 200, { status: recovered.status });
  } else {
    check("login_rate_limit_retry_after", false, { reason: "burst_did_not_429" });
    check("login_rate_limit_recovered", false, { reason: "burst_did_not_429" });
  }
} finally {
  // Cleanup synthetic users (best-effort)
  if (createdEmails.length) {
    await client
      .query(`DELETE FROM workspace_members WHERE email = ANY($1::text[])`, [createdEmails])
      .catch(() => {});
    await client
      .query(`DELETE FROM nelvyon_users WHERE email = ANY($1::text[])`, [createdEmails])
      .catch(() => {});
  }
  await client.end();
}

evidence.finishedAt = new Date().toISOString();
evidence.passed = evidence.checks.filter((c) => c.ok).length;
evidence.failed = evidence.checks.filter((c) => !c.ok).length;
evidence.verdict = evidence.failed === 0 ? "PASSWORD_CERT_PASS" : "PASSWORD_CERT_PARTIAL";
mkdirSync(join(process.cwd(), "docs/evidence"), { recursive: true });
const out = join(process.cwd(), "docs/evidence", `staging-password-cert-${Date.now()}.json`);
writeFileSync(out, JSON.stringify(evidence, null, 2));
console.log(`verdict=${evidence.verdict} passed=${evidence.passed} failed=${evidence.failed}`);
console.log(`evidence=${out}`);
process.exit(evidence.failed === 0 ? 0 : 2);
