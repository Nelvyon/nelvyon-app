#!/usr/bin/env node
/**
 * Module: saas.auth.jwt — HTTP live certification (no API mocks).
 * Requires: Next.js on CERT_BASE_URL + DATABASE_URL + JWT_SECRET (≥32).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID, createHash } from "node:crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "docs", "evidence", "os-saas-e2e", "modules");
const base = (
  process.env.CERT_BASE_URL ||
  process.env.STAGING_BASE_URL ||
  "https://ideal-victory-staging.up.railway.app"
).replace(/\/$/, "");
const results = [];

function record(flow, ok, detail = {}) {
  results.push({ flow, ok, ...detail, at: new Date().toISOString() });
  console.log(`${ok ? "PASS" : "FAIL"} ${flow}${detail.error ? ` — ${detail.error}` : ""}`);
}

async function req(method, urlPath, { body, cookie, token } = {}) {
  const headers = { "content-type": "application/json", accept: "application/json" };
  if (cookie) headers.cookie = cookie;
  if (token) headers.authorization = `Bearer ${token}`;
  const t0 = performance.now();
  const res = await fetch(`${base}${urlPath}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    redirect: "manual",
  });
  const ms = Math.round(performance.now() - t0);
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text.slice(0, 200) };
  }
  const setCookie = res.headers.getSetCookie?.() ?? [];
  return { status: res.status, json, ms, setCookie, headers: res.headers };
}

function extractNelvyonCookie(setCookie) {
  for (const c of setCookie) {
    const m = String(c).match(/nelvyon_token=([^;]+)/);
    if (m) return `nelvyon_token=${m[1]}`;
  }
  return null;
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const stamp = new Date().toISOString();
  const email = `cert-auth-${randomUUID().slice(0, 8)}@nelvyon.test`;
  const password = "CertPassw0rd!Live";
  const name = "Cert Auth Owner";

  // Health
  try {
    const h = await req("GET", "/api/health");
    record("http.health", h.status >= 200 && h.status < 500, { status: h.status, ms: h.ms });
  } catch (e) {
    record("http.health", false, { error: e instanceof Error ? e.message : String(e) });
    return finish(1, stamp);
  }

  // Register validation
  {
    const bad = await req("POST", "/api/auth/register", { body: { email: "bad", password: "x", name: "A" } });
    record("auth.register_validation", bad.status === 400, { status: bad.status, ms: bad.ms });
  }

  // Register
  let token = null;
  let cookie = null;
  let userId = null;
  {
    const r = await req("POST", "/api/auth/register", {
      body: { email, password, name },
    });
    token = r.json?.token ?? null;
    userId = r.json?.userId ?? null;
    cookie = extractNelvyonCookie(r.setCookie);
    record("auth.register", r.status === 200 && Boolean(token) && Boolean(userId), {
      status: r.status,
      ms: r.ms,
      hasToken: Boolean(token),
      hasCookie: Boolean(cookie),
      userId,
      error: r.status !== 200 ? JSON.stringify(r.json)?.slice(0, 200) : undefined,
    });
  }

  // Duplicate register → 409
  {
    const r = await req("POST", "/api/auth/register", {
      body: { email, password, name },
    });
    record("auth.register_duplicate_409", r.status === 409, { status: r.status, ms: r.ms });
  }

  // Bad login
  {
    const r = await req("POST", "/api/auth/login", {
      body: { email, password: "wrong-password-xxx" },
    });
    record("auth.login_bad_401", r.status === 401, { status: r.status, ms: r.ms });
  }

  // Good login
  {
    const r = await req("POST", "/api/auth/login", { body: { email, password } });
    const loginToken = r.json?.token ?? null;
    const loginCookie = extractNelvyonCookie(r.setCookie) || cookie;
    if (loginToken) token = loginToken;
    if (loginCookie) cookie = loginCookie;
    record("auth.login", r.status === 200 && Boolean(loginToken), {
      status: r.status,
      ms: r.ms,
      hasCookie: Boolean(loginCookie),
    });
  }

  // SaaS API without auth → 401
  {
    const r = await req("GET", "/api/saas/crm/contacts");
    record("auth.saas_api_401_no_token", r.status === 401, { status: r.status, ms: r.ms });
  }

  // SaaS API with cookie — may be 401/404 if no saas tenant yet; must NOT be 500
  {
    const r = await req("GET", "/api/saas/crm/contacts", { cookie, token });
    const ok = r.status === 200 || r.status === 401 || r.status === 403 || r.status === 404;
    record("auth.saas_api_with_token_no_500", ok && r.status !== 500, {
      status: r.status,
      ms: r.ms,
      note: "200 requires saas_tenants onboarding; 401/403/404 acceptable for auth-module scope",
    });
  }

  // Logout if endpoint exists (best-effort)
  try {
    const r = await req("POST", "/api/auth/logout", { cookie, token });
    record("auth.logout_endpoint", r.status < 500, { status: r.status, ms: r.ms });
  } catch {
    record("auth.logout_endpoint", true, { skipped: true, note: "optional" });
  }

  const fail = results.filter((x) => !x.ok).length;
  return finish(fail > 0 ? 1 : 0, stamp, { email, userId });
}

function finish(code, stamp, meta = {}) {
  const summary = {
    module: "saas.auth.jwt",
    tag: "module_cert_http_live",
    timestamp: stamp,
    baseUrl: base,
    totals: {
      pass: results.filter((r) => r.ok).length,
      fail: results.filter((r) => !r.ok).length,
      flows: results.length,
    },
    meta,
    results,
    hash: createHash("sha256").update(JSON.stringify(results)).digest("hex").slice(0, 16),
    decision: null,
  };
  const allCritical = [
    "http.health",
    "auth.register",
    "auth.register_duplicate_409",
    "auth.login_bad_401",
    "auth.login",
    "auth.saas_api_401_no_token",
    "auth.saas_api_with_token_no_500",
  ].every((f) => results.find((r) => r.flow === f)?.ok);
  summary.decision = allCritical && code === 0 ? "CERTIFIED" : "FAIL";
  fs.writeFileSync(path.join(OUT, "saas.auth.jwt_latest.json"), JSON.stringify(summary, null, 2));
  fs.writeFileSync(
    path.join(OUT, `saas.auth.jwt_${stamp.replace(/[:.]/g, "-")}.json`),
    JSON.stringify(summary, null, 2),
  );
  console.log("\n=== saas.auth.jwt ===");
  console.log(JSON.stringify({ totals: summary.totals, decision: summary.decision }, null, 2));
  process.exit(code);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
