#!/usr/bin/env node
/**
 * Controlled wf.create reproduction against CERT_BASE_URL (staging).
 * Does not send commercial email. Creates disposable cert tenant only.
 */
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const base = (process.env.CERT_BASE_URL || "").replace(/\/$/, "");
if (!base) {
  console.error("CERT_BASE_URL required");
  process.exit(2);
}

const outDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "docs",
  "evidence",
  "os-saas-e2e",
  "modules",
);
fs.mkdirSync(outDir, { recursive: true });

async function req(method, urlPath, { body, cookie, token } = {}) {
  const headers = { "content-type": "application/json", accept: "application/json" };
  if (cookie) headers.cookie = cookie;
  if (token) headers.authorization = `Bearer ${token}`;
  const t0 = performance.now();
  const res = await fetch(`${base}${urlPath}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const ms = Math.round(performance.now() - t0);
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text.slice(0, 400) };
  }
  const setCookie = res.headers.getSetCookie?.() ?? [];
  return { status: res.status, json, ms, setCookie, text: text.slice(0, 500) };
}

function cookieFrom(setCookie) {
  for (const c of setCookie) {
    const m = String(c).match(/nelvyon_token=([^;]+)/);
    if (m) return `nelvyon_token=${m[1]}`;
  }
  return null;
}

const results = [];
function record(flow, ok, detail = {}) {
  results.push({ flow, ok, ...detail, at: new Date().toISOString() });
  console.log(`${ok ? "PASS" : "FAIL"} ${flow}${detail.status != null ? ` [${detail.status}]` : ""}${detail.error ? ` — ${detail.error}` : ""}`);
}

const email = `cert-wfcreate-${randomUUID().slice(0, 8)}@nelvyon.test`;
const password = "CertPassw0rd!Live99";

const health = await req("GET", "/api/health");
record("http.health", health.status === 200, { status: health.status, ms: health.ms });

const reg = await req("POST", "/api/auth/register", {
  body: { email, password, name: "Cert WfCreate" },
});
const token = reg.json?.token;
const cookie = cookieFrom(reg.setCookie);
record("register", Boolean(reg.status === 200 && token && cookie), {
  status: reg.status,
  ms: reg.ms,
  error: reg.status !== 200 ? JSON.stringify(reg.json)?.slice(0, 200) : undefined,
});

if (token && cookie) {
  const create = await req("POST", "/api/saas/onboarding", {
    cookie,
    token,
    body: { companyName: "Co-WfCreate", industry: "tech", plan: "pro", step: 4, goals: ["cert"] },
  });
  record("onboard_create", create.status === 200, {
    status: create.status,
    ms: create.ms,
    error: create.status !== 200 ? JSON.stringify(create.json)?.slice(0, 200) : undefined,
  });

  const done = await req("POST", "/api/saas/onboarding/complete", { cookie, token, body: {} });
  const tenantId = done.json?.tenant?.id ?? create.json?.tenant?.id;
  record("onboard_complete", Boolean(done.status === 200 && tenantId), {
    status: done.status,
    tenantId,
    ms: done.ms,
  });

  const meta = await req("GET", "/api/saas/workflows?resource=meta", { cookie, token });
  record("wf.meta", meta.status === 200 && Array.isArray(meta.json?.triggers), {
    status: meta.status,
    triggers: Array.isArray(meta.json?.triggers) ? meta.json.triggers.length : null,
  });

  const payloads = [
    {
      name: "cert-manual-active",
      body: {
        name: "Cert WF Active",
        triggerType: "manual",
        triggerConfig: {},
        conditions: [],
        actions: [{ type: "notify", config: { message: "cert" } }],
        status: "active",
      },
    },
    {
      name: "cert-manual-draft",
      body: {
        name: "Cert WF Draft",
        triggerType: "manual",
        actions: [{ type: "notify", config: { message: "cert" } }],
      },
    },
    {
      name: "cert-score-threshold",
      body: {
        name: "Cert WF Score",
        triggerType: "score_threshold",
        triggerConfig: { threshold: 80 },
        actions: [{ type: "notify", config: { message: "hot" } }],
        status: "draft",
      },
    },
  ];

  for (const p of payloads) {
    const res = await req("POST", "/api/saas/workflows", { cookie, token, body: p.body });
    record(`wf.create.${p.name}`, res.status === 201 || res.status === 200, {
      status: res.status,
      ms: res.ms,
      id: res.json?.workflow?.id,
      error: ![200, 201].includes(res.status) ? JSON.stringify(res.json)?.slice(0, 300) : undefined,
      code: res.json?.code,
    });
  }

  const list = await req("GET", "/api/saas/workflows", { cookie, token });
  record("wf.list", list.status === 200, {
    status: list.status,
    count: Array.isArray(list.json?.workflows) ? list.json.workflows.length : null,
    ses_configured: list.json?.ses_configured,
    twilio_configured: list.json?.twilio_configured,
  });
}

const fail = results.filter((r) => !r.ok).length;
const summary = {
  module: "saas.workflows.wf_create_repro",
  tag: "controlled_repro_staging",
  timestamp: new Date().toISOString(),
  baseUrl: base,
  totals: { pass: results.filter((r) => r.ok).length, fail, flows: results.length },
  results,
  decision: fail === 0 ? "PASS" : "FAIL",
};
const stamp = summary.timestamp.replace(/[:.]/g, "-");
fs.writeFileSync(path.join(outDir, `saas.workflows.wf_create_repro_latest.json`), JSON.stringify(summary, null, 2));
fs.writeFileSync(path.join(outDir, `saas.workflows.wf_create_repro_${stamp}.json`), JSON.stringify(summary, null, 2));
console.log("\n=== SUMMARY ===");
console.log(JSON.stringify(summary.totals));
console.log("decision", summary.decision);
process.exit(fail === 0 ? 0 : 1);
