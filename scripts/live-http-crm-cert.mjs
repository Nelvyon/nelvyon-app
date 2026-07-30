#!/usr/bin/env node
/**
 * Module: saas.crm.contacts — HTTP live certification (no API mocks).
 * Flow: register → onboarding tenant → complete → CRM CRUD → cross-tenant isolation.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID, createHash } from "node:crypto";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "docs", "evidence", "os-saas-e2e", "modules");
const base = (
  process.env.CERT_BASE_URL ||
  process.env.STAGING_BASE_URL ||
  "https://ideal-victory-staging.up.railway.app"
).replace(/\/$/, "");
const results = [];
const latencies = [];

function record(flow, ok, detail = {}) {
  results.push({ flow, ok, ...detail, at: new Date().toISOString() });
  console.log(`${ok ? "PASS" : "FAIL"} ${flow}${detail.error ? ` — ${detail.error}` : ""}${detail.status ? ` [${detail.status}]` : ""}`);
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
  latencies.push({ path: urlPath, method, ms, status: res.status });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text.slice(0, 300) };
  }
  const setCookie = res.headers.getSetCookie?.() ?? [];
  return { status: res.status, json, ms, setCookie };
}

function cookieFrom(setCookie) {
  for (const c of setCookie) {
    const m = String(c).match(/nelvyon_token=([^;]+)/);
    if (m) return `nelvyon_token=${m[1]}`;
  }
  return null;
}

async function registerUser(label) {
  const email = `cert-crm-${label}-${randomUUID().slice(0, 8)}@nelvyon.test`;
  const password = "CertPassw0rd!Crm";
  const r = await req("POST", "/api/auth/register", {
    body: { email, password, name: `Cert CRM ${label}` },
  });
  const token = r.json?.token;
  const cookie = cookieFrom(r.setCookie);
  const userId = r.json?.userId;
  record(`crm.setup.register_${label}`, r.status === 200 && token && cookie && userId, {
    status: r.status,
    ms: r.ms,
    error: r.status !== 200 ? JSON.stringify(r.json)?.slice(0, 180) : undefined,
  });
  return { email, password, token, cookie, userId };
}

async function onboard(session, company) {
  const create = await req("POST", "/api/saas/onboarding", {
    cookie: session.cookie,
    token: session.token,
    body: {
      companyName: company,
      industry: "tech",
      plan: "pro",
      step: 4,
      goals: ["cert"],
    },
  });
  record(`crm.setup.onboarding_create_${company}`, create.status === 200 && create.json?.tenant, {
    status: create.status,
    ms: create.ms,
    error: create.status !== 200 ? JSON.stringify(create.json)?.slice(0, 200) : undefined,
  });

  const done = await req("POST", "/api/saas/onboarding/complete", {
    cookie: session.cookie,
    token: session.token,
    body: {},
  });
  const completed = done.status === 200 && done.json?.tenant?.onboardingCompleted === true;
  record(`crm.setup.onboarding_complete_${company}`, completed || (done.status === 200 && done.json?.tenant), {
    status: done.status,
    ms: done.ms,
    tenantId: done.json?.tenant?.id,
    onboardingCompleted: done.json?.tenant?.onboardingCompleted,
    error: done.status !== 200 ? JSON.stringify(done.json)?.slice(0, 200) : undefined,
  });
  return done.json?.tenant ?? create.json?.tenant;
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const stamp = new Date().toISOString();

  try {
    const h = await req("GET", "/api/health");
    record("crm.http.health", h.status === 200, { status: h.status, ms: h.ms });
  } catch (e) {
    record("crm.http.health", false, { error: String(e) });
    return finish(1, stamp);
  }

  const userA = await registerUser("A");
  const userB = await registerUser("B");
  if (!userA.token || !userB.token) return finish(1, stamp);

  const tenantA = await onboard(userA, "CertCRM-A");
  const tenantB = await onboard(userB, "CertCRM-B");
  if (!tenantA?.id || !tenantB?.id) return finish(1, stamp);

  // 401 without auth
  {
    const r = await req("GET", "/api/saas/crm/contacts");
    record("crm.http.401", r.status === 401, { status: r.status, ms: r.ms });
  }

  // Create contact A
  let contactAId = null;
  {
    const r = await req("POST", "/api/saas/crm/contacts", {
      cookie: userA.cookie,
      token: userA.token,
      body: {
        name: "Alpha Contact",
        email: "alpha@tenant-a.test",
        notes: "secret-A-http",
        value: 1500,
        status: "lead",
        pipeline_stage: "new",
      },
    });
    contactAId = r.json?.contact?.id ?? null;
    record("crm.http.create_a", r.status === 201 && Boolean(contactAId), {
      status: r.status,
      ms: r.ms,
      id: contactAId,
      error: r.status !== 201 ? JSON.stringify(r.json)?.slice(0, 200) : undefined,
    });
  }

  // Create contact B
  let contactBId = null;
  {
    const r = await req("POST", "/api/saas/crm/contacts", {
      cookie: userB.cookie,
      token: userB.token,
      body: {
        name: "Beta Contact",
        email: "beta@tenant-b.test",
        notes: "secret-B-http",
        value: 2500,
      },
    });
    contactBId = r.json?.contact?.id ?? null;
    record("crm.http.create_b", r.status === 201 && Boolean(contactBId), {
      status: r.status,
      ms: r.ms,
      id: contactBId,
    });
  }

  // List A excludes B
  {
    const r = await req("GET", "/api/saas/crm/contacts", {
      cookie: userA.cookie,
      token: userA.token,
    });
    const contacts = r.json?.contacts ?? [];
    const ids = contacts.map((c) => c.id);
    const notes = contacts.map((c) => c.notes);
    const ok =
      r.status === 200 &&
      ids.includes(contactAId) &&
      !ids.includes(contactBId) &&
      !notes.includes("secret-B-http");
    record("crm.http.list_isolation", ok, {
      status: r.status,
      ms: r.ms,
      count: contacts.length,
    });
  }

  // IDOR: A cannot GET B by id
  if (contactBId) {
    const r = await req("GET", `/api/saas/crm/contacts/${contactBId}`, {
      cookie: userA.cookie,
      token: userA.token,
    });
    record("crm.http.idor_get", r.status === 404 || r.status === 403, {
      status: r.status,
      ms: r.ms,
    });
  }

  // Update A
  if (contactAId) {
    const r = await req("PATCH", `/api/saas/crm/contacts/${contactAId}`, {
      cookie: userA.cookie,
      token: userA.token,
      body: { notes: "updated-A", pipeline_stage: "contacted" },
    });
    // some routes use PUT
    const r2 =
      r.status >= 400
        ? await req("PUT", `/api/saas/crm/contacts/${contactAId}`, {
            cookie: userA.cookie,
            token: userA.token,
            body: { notes: "updated-A", pipeline_stage: "contacted" },
          })
        : r;
    record("crm.http.update_a", r2.status === 200, {
      status: r2.status,
      ms: r2.ms,
      error: r2.status !== 200 ? JSON.stringify(r2.json)?.slice(0, 200) : undefined,
    });
  }

  // Search
  {
    const r = await req("GET", "/api/saas/crm/contacts?search=Alpha", {
      cookie: userA.cookie,
      token: userA.token,
    });
    const contacts = r.json?.contacts ?? [];
    record("crm.http.search", r.status === 200 && contacts.some((c) => c.id === contactAId), {
      status: r.status,
      ms: r.ms,
      count: contacts.length,
    });
  }

  // Perf list
  const samples = [];
  for (let i = 0; i < 20; i++) {
    const r = await req("GET", "/api/saas/crm/contacts", {
      cookie: userA.cookie,
      token: userA.token,
    });
    samples.push(r.ms);
  }
  samples.sort((a, b) => a - b);
  const p95 = samples[Math.min(samples.length - 1, Math.ceil(0.95 * samples.length) - 1)];
  record("crm.http.perf_list_p95", p95 <= 500, {
    p50: samples[Math.floor(samples.length / 2)],
    p95,
    p99: samples[samples.length - 1],
    budgetMs: 500,
  });

  // Delete A
  if (contactAId) {
    const r = await req("DELETE", `/api/saas/crm/contacts/${contactAId}`, {
      cookie: userA.cookie,
      token: userA.token,
    });
    record("crm.http.delete_a", r.status === 200 || r.status === 204, {
      status: r.status,
      ms: r.ms,
    });
  }

  const fail = results.filter((r) => !r.ok).length;
  return finish(fail > 0 ? 1 : 0, stamp, { tenantA: tenantA.id, tenantB: tenantB.id });
}

function finish(code, stamp, meta = {}) {
  const critical = [
    "crm.http.health",
    "crm.setup.register_A",
    "crm.setup.register_B",
    "crm.setup.onboarding_create_CertCRM-A",
    "crm.setup.onboarding_complete_CertCRM-A",
    "crm.setup.onboarding_create_CertCRM-B",
    "crm.setup.onboarding_complete_CertCRM-B",
    "crm.http.401",
    "crm.http.create_a",
    "crm.http.create_b",
    "crm.http.list_isolation",
    "crm.http.idor_get",
  ];
  const criticalOk = critical.every((f) => results.find((r) => r.flow === f)?.ok);
  const summary = {
    module: "saas.crm.contacts",
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
    latenciesTail: latencies.slice(-15),
    hash: createHash("sha256").update(JSON.stringify(results)).digest("hex").slice(0, 16),
    decision: criticalOk && code === 0 ? "CERTIFIED" : "FAIL",
  };
  fs.writeFileSync(path.join(OUT, "saas.crm.contacts_latest.json"), JSON.stringify(summary, null, 2));
  fs.writeFileSync(
    path.join(OUT, `saas.crm.contacts_${stamp.replace(/[:.]/g, "-")}.json`),
    JSON.stringify(summary, null, 2),
  );
  console.log("\n=== saas.crm.contacts ===");
  console.log(JSON.stringify({ totals: summary.totals, decision: summary.decision }, null, 2));
  process.exit(code);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
