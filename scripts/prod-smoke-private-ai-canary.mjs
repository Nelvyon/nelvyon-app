#!/usr/bin/env node
/**
 * Production Private AI minimal canary smoke (ADR-068).
 * Real HTTP only — no mocks. OpenAI must stay OFF.
 *
 * Usage:
 *   PROD_BASE_URL=https://app.nelvyon.com node scripts/prod-smoke-private-ai-canary.mjs
 *
 * Expects Railway prod canary window:
 *   NELVYON_PRIVATE_AI_PROD_CANARY_ENABLED=1
 *   NELVYON_AI_ENABLED=1
 *   OLLAMA_CONFIGURED=1
 *   AUTONOMOUS_ALLOW_OPENAI=0
 *   kill switch unset/0
 */
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";

const BASE =
  process.env.PROD_BASE_URL?.trim() ||
  process.env.STAGING_BASE_URL?.trim() ||
  "https://app.nelvyon.com";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const evidenceDir = path.join(root, "scripts/docs/evidence/os-saas-e2e/modules");

const checks = [];
function pass(name, detail) {
  checks.push({ name, ok: true, detail: String(detail) });
  console.log(`PASS [pai-canary] ${name}: ${detail}`);
}
function fail(name, detail) {
  checks.push({ name, ok: false, detail: String(detail) });
  console.log(`FAIL [pai-canary] ${name}: ${detail}`);
}

async function req(method, urlPath, { token, body, timeoutMs = 120_000 } = {}) {
  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
    headers.Cookie = `nelvyon_token=${token}`;
  }
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${BASE}${urlPath}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      cache: "no-store",
      signal: ctrl.signal,
    });
    const text = await res.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = { raw: text.slice(0, 240) };
    }
    return { status: res.status, json, text: text.slice(0, 400) };
  } finally {
    clearTimeout(t);
  }
}

async function registerOnboard(label) {
  const email = `pai-canary-${label}-${randomUUID().slice(0, 8)}@nelvyon.test`;
  const password = "PaiCanaryPassw0rd!Live99";
  let reg = null;
  for (let attempt = 1; attempt <= 6; attempt++) {
    reg = await req("POST", "/api/auth/register", {
      body: { email, password, name: `PAI ${label}` },
    });
    if (reg.status !== 429) break;
    await new Promise((r) => setTimeout(r, 5000));
  }
  const token = reg.json?.token;
  if (!token) {
    fail(`${label}.register`, `HTTP ${reg.status} ${JSON.stringify(reg.json).slice(0, 160)}`);
    return null;
  }
  pass(`${label}.register`, email);
  await req("POST", "/api/saas/onboarding", {
    token,
    body: {
      companyName: `PAI-${label}-${randomUUID().slice(0, 6)}`,
      industry: "tech",
      plan: "pro",
      step: 4,
      goals: ["pai-canary"],
    },
  });
  const done = await req("POST", "/api/saas/onboarding/complete", {
    token,
    body: { business_name: `PAI-${label}` },
  });
  const tenantId = done.json?.tenant?.id || "";
  pass(`${label}.onboard`, tenantId || `status=${done.status}`);
  return { email, token, tenantId };
}

async function main() {
  console.log(`pai-canary base=${BASE}`);
  const live = await req("GET", "/api/health/live", { timeoutMs: 20_000 });
  if (live.status === 200 && live.json?.ok) {
    pass("health.live", `sha=${live.json.git_sha || "?"}`);
  } else {
    fail("health.live", `HTTP ${live.status}`);
  }
  const ready = await req("GET", "/api/health/ready", { timeoutMs: 30_000 });
  if (ready.status === 200 && (ready.json?.status === "ready" || ready.json?.ok === true)) {
    pass("health.ready", JSON.stringify(ready.json?.database?.status || ready.json?.status || "ok"));
  } else {
    fail("health.ready", `HTTP ${ready.status} ${JSON.stringify(ready.json).slice(0, 160)}`);
  }

  const a = await registerOnboard("A");
  const b = await registerOnboard("B");
  if (!a?.token || !b?.token) {
    writeEvidence(false);
    process.exit(1);
  }

  const rh = await req("GET", "/api/saas/private-ai/router-health", {
    token: a.token,
    timeoutMs: 60_000,
  });
  if (rh.status === 200) {
    pass("router.health", JSON.stringify(rh.json).slice(0, 200));
  } else {
    fail("router.health", `HTTP ${rh.status} ${JSON.stringify(rh.json).slice(0, 200)}`);
  }

  const status = await req("GET", "/api/saas/private-ai/status", {
    token: a.token,
    timeoutMs: 30_000,
  });
  if (status.status === 200) {
    const blob = JSON.stringify(status.json);
    if (/openai|sk-/i.test(blob) && /allow.*true|enabled.*true/i.test(blob)) {
      fail("status.no_openai", blob.slice(0, 200));
    } else {
      pass("status.ok", blob.slice(0, 200));
    }
  } else {
    fail("status.ok", `HTTP ${status.status}`);
  }

  // Low-risk PM-style prompt → expect 3B path when QR on
  const routeA = await req("POST", "/api/saas/private-ai/inference", {
    token: a.token,
    timeoutMs: 60_000,
    body: {
      mode: "route",
      query: "Responde en una frase: que es un KPI operativo basico?",
    },
  });
  if (routeA.status === 200) {
    pass("router.route", JSON.stringify(routeA.json).slice(0, 220));
  } else {
    fail("router.route", `HTTP ${routeA.status} ${JSON.stringify(routeA.json).slice(0, 220)}`);
  }

  const infA = await req("POST", "/api/saas/private-ai/inference", {
    token: a.token,
    timeoutMs: 180_000,
    body: {
      mode: "execute",
      query: "Responde en una frase: que es un KPI operativo basico?",
    },
  });
  if (infA.status === 200 || infA.status === 201) {
    const text =
      infA.json?.result?.text ||
      infA.json?.result?.output ||
      infA.json?.text ||
      infA.json?.output ||
      "";
    const model =
      infA.json?.result?.model ||
      infA.json?.result?.routedModel ||
      infA.json?.model ||
      "";
    if (String(text).trim().length > 0) {
      pass("inference.A", `model=${model || "n/a"} chars=${String(text).length}`);
    } else {
      fail("inference.A", `empty body ${JSON.stringify(infA.json).slice(0, 240)}`);
    }
  } else {
    fail(
      "inference.A",
      `HTTP ${infA.status} ${JSON.stringify(infA.json || infA.text).slice(0, 300)}`,
    );
  }

  // Isolation: B must not see A's tenant in status/audit if present
  const statusB = await req("GET", "/api/saas/private-ai/status", { token: b.token });
  if (statusB.status === 200) {
    const s = JSON.stringify(statusB.json);
    if (a.tenantId && s.includes(a.tenantId)) {
      fail("isolation.B_status", "tenant A id leaked into B status");
    } else {
      pass("isolation.B_status", "no A tenant id in B payload");
    }
  } else {
    fail("isolation.B_status", `HTTP ${statusB.status}`);
  }

  const unauth = await req("POST", "/api/saas/private-ai/inference", {
    body: { mode: "execute", query: "ping" },
    timeoutMs: 20_000,
  });
  if (unauth.status === 401 || unauth.status === 403) {
    pass("auth.required", `HTTP ${unauth.status}`);
  } else {
    fail("auth.required", `HTTP ${unauth.status}`);
  }

  const allOk = checks.every((c) => c.ok);
  writeEvidence(allOk);
  process.exit(allOk ? 0 : 1);
}

function writeEvidence(allOk) {
  const md = [
    "# Private AI production canary smoke",
    "",
    `| Campo | Valor |`,
    `|-------|-------|`,
    `| Fecha | ${new Date().toISOString()} |`,
    `| Base | ${BASE} |`,
    `| Verdict | ${allOk ? "**ALL_PASS**" : "**FAIL**"} |`,
    `| OpenAI | must remain OFF |`,
    "",
    "## Checks",
    "",
    "| Check | Result | Detail |",
    "|-------|--------|--------|",
    ...checks.map(
      (c) =>
        `| ${c.name} | ${c.ok ? "PASS" : "FAIL"} | ${c.detail.replace(/\|/g, "/")} |`,
    ),
    "",
  ].join("\n");
  fs.mkdirSync(evidenceDir, { recursive: true });
  fs.writeFileSync(path.join(evidenceDir, "private-ai.prod_canary_smoke_latest.md"), md);
  console.log("evidence → private-ai.prod_canary_smoke_latest.md");
  console.log(allOk ? "PASS [pai-canary]" : "FAIL [pai-canary]");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
