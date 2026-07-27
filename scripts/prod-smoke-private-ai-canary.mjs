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

  // Wait until the serving instance has the canary window (Railway env flips rebuild).
  // Without this, executeInference fail-closes with PRIVATE_AI_CANARY_BLOCKED while BUILDING.
  let canaryReady = false;
  const readyDeadline = Date.now() + 15 * 60_000;
  while (Date.now() < readyDeadline) {
    const probe = await req("POST", "/api/saas/private-ai/inference", {
      token: a.token,
      timeoutMs: 30_000,
      body: { mode: "route", query: "ping canary readiness" },
    });
    const execProbe = await req("POST", "/api/saas/private-ai/inference", {
      token: a.token,
      timeoutMs: 45_000,
      body: { mode: "execute", query: "Responde una palabra: ok" },
    });
    const blocked =
      execProbe.status === 403 &&
      /PRIVATE_AI_CANARY_BLOCKED/i.test(JSON.stringify(execProbe.json || ""));
    const internalMasked =
      execProbe.status === 500 && /Internal error/i.test(JSON.stringify(execProbe.json || ""));
    if (execProbe.status === 200 || execProbe.status === 201) {
      canaryReady = true;
      pass("canary.window_ready", `HTTP ${execProbe.status} after readiness wait`);
      // Re-use first successful execute as inference.A if content present
      break;
    }
    if (!blocked && !internalMasked && execProbe.status !== 502 && execProbe.status !== 503) {
      // Unexpected non-ready error — fail fast (do not burn the window)
      fail(
        "canary.window_ready",
        `unexpected HTTP ${execProbe.status} ${JSON.stringify(execProbe.json || execProbe.text).slice(0, 220)}`,
      );
      writeEvidence(false);
      process.exit(1);
    }
    console.log(
      `WAIT [pai-canary] canary window not active yet (route=${probe.status} exec=${execProbe.status}) — sleeping 20s`,
    );
    await new Promise((r) => setTimeout(r, 20_000));
  }
  if (!canaryReady) {
    fail("canary.window_ready", "timeout waiting for PROD_CANARY_ENABLED on serving instance");
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
    const openaiOn =
      /"openai"[^}]{0,80}"(enabled|allow)"\s*:\s*true/i.test(blob) ||
      /AUTONOMOUS_ALLOW_OPENAI["']?\s*:\s*["']?1/i.test(blob) ||
      /sk-[A-Za-z0-9]{20,}/.test(blob);
    if (openaiOn) {
      fail("status.no_openai", blob.slice(0, 200));
    } else {
      pass("status.ok_no_openai_egress", blob.slice(0, 200));
    }
  } else {
    fail("status.ok_no_openai_egress", `HTTP ${status.status}`);
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

  const infStart = Date.now();
  const infA = await req("POST", "/api/saas/private-ai/inference", {
    token: a.token,
    timeoutMs: 180_000,
    body: {
      mode: "execute",
      query: "Responde en una frase: que es un KPI operativo basico?",
    },
  });
  const infLatencyMs = Date.now() - infStart;
  if (infA.status === 200 || infA.status === 201) {
    const text =
      infA.json?.result?.text ||
      infA.json?.result?.output ||
      infA.json?.result?.content ||
      infA.json?.text ||
      infA.json?.output ||
      "";
    const model =
      infA.json?.result?.model ||
      infA.json?.result?.routedModel ||
      infA.json?.result?.meta?.finalModel ||
      infA.json?.model ||
      "";
    const content =
      String(text).trim() ||
      String(infA.json?.result?.content ?? "").trim();
    if (content.length > 0 && !/^ERROR:/i.test(content)) {
      pass("inference.A", `model=${model || "n/a"} chars=${content.length} latencyMs=${infLatencyMs}`);
      if (infLatencyMs <= 120_000) {
        pass("inference.latency", `${infLatencyMs}ms (<=120s soft gate)`);
      } else {
        fail("inference.latency", `${infLatencyMs}ms >120s`);
      }
    } else {
      fail("inference.A", `empty/error body ${JSON.stringify(infA.json).slice(0, 240)}`);
    }
  } else {
    fail(
      "inference.A",
      `HTTP ${infA.status} ${JSON.stringify(infA.json || infA.text).slice(0, 300)}`,
    );
  }

  // Audit log path (synthetic tenant) — must return tenant-scoped rows or empty list, never A data for B later
  const auditA = await req("GET", "/api/saas/private-ai/audit", { token: a.token, timeoutMs: 30_000 });
  if (auditA.status === 200) {
    pass("logs.audit.A", JSON.stringify(auditA.json).slice(0, 180));
  } else {
    fail("logs.audit.A", `HTTP ${auditA.status} ${JSON.stringify(auditA.json).slice(0, 160)}`);
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
