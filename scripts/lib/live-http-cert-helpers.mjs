#!/usr/bin/env node
/** Shared helpers for HTTP live module certification. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID, createHash } from "node:crypto";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
export const MODULES_OUT = path.join(ROOT, "docs", "evidence", "os-saas-e2e", "modules");
export const base = (
  process.env.CERT_BASE_URL ||
  process.env.STAGING_BASE_URL ||
  "https://ideal-victory-staging.up.railway.app"
).replace(/\/$/, "");

export function makeRecorder() {
  const results = [];
  function record(flow, ok, detail = {}) {
    results.push({ flow, ok, ...detail, at: new Date().toISOString() });
    console.log(`${ok ? "PASS" : "FAIL"} ${flow}${detail.status != null ? ` [${detail.status}]` : ""}${detail.error ? ` — ${detail.error}` : ""}`);
  }
  return { results, record };
}

export async function req(method, urlPath, { body, cookie, token } = {}) {
  const headers = { "content-type": "application/json", accept: "application/json" };
  if (cookie) headers.cookie = cookie;
  if (token) headers.authorization = `Bearer ${token}`;
  const maxAttempts = 4;
  let lastErr;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const t0 = performance.now();
    try {
      const res = await fetch(`${base}${urlPath}`, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        redirect: "manual",
      });
      const ms = Math.round(performance.now() - t0);
      const text = await res.text();
      let json = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {
        json = { raw: text.slice(0, 300) };
      }
      const setCookie = res.headers.getSetCookie?.() ?? [];
      return { status: res.status, json, ms, setCookie };
    } catch (e) {
      lastErr = e;
      const code = e?.cause?.code || e?.code || "";
      const transient = ["ECONNRESET", "ECONNREFUSED", "ETIMEDOUT", "UND_ERR_SOCKET"].includes(code) || /fetch failed/i.test(String(e));
      if (!transient || attempt === maxAttempts) throw e;
      await new Promise((r) => setTimeout(r, 400 * attempt));
    }
  }
  throw lastErr;
}

export function cookieFrom(setCookie) {
  for (const c of setCookie) {
    const m = String(c).match(/nelvyon_token=([^;]+)/);
    if (m) return `nelvyon_token=${m[1]}`;
  }
  return null;
}

export async function registerAndOnboard(record, label) {
  const email = `cert-${label}-${randomUUID().slice(0, 8)}@nelvyon.test`;
  const password = "CertPassw0rd!Live99";
  let reg = null;
  for (let attempt = 1; attempt <= 8; attempt++) {
    reg = await req("POST", "/api/auth/register", {
      body: { email, password, name: `Cert ${label}` },
    });
    if (reg.status !== 429) break;
    const waitSec = Number(reg.json?.retryAfter ?? 60);
    // Sliding window: wait full retryAfter plus buffer so the IP budget clears.
    const waitMs = Math.min(Math.max((waitSec + 15) * 1000, 75_000), 180_000);
    console.log(`RATE_LIMIT register ${label} — waiting ${waitMs}ms (attempt ${attempt})`);
    await new Promise((r) => setTimeout(r, waitMs));
  }
  const token = reg.json?.token;
  const cookie = cookieFrom(reg.setCookie);
  const userId = reg.json?.userId;
  record(`${label}.register`, Boolean(reg.status === 200 && token && cookie), {
    status: reg.status,
    ms: reg.ms,
    error: reg.status !== 200 ? JSON.stringify(reg.json)?.slice(0, 160) : undefined,
  });
  if (!token) return null;

  const create = await req("POST", "/api/saas/onboarding", {
    cookie,
    token,
    body: { companyName: `Co-${label}`, industry: "tech", plan: "pro", step: 4, goals: ["cert"] },
  });
  record(`${label}.onboard_create`, create.status === 200, {
    status: create.status,
    ms: create.ms,
    error: create.status !== 200 ? JSON.stringify(create.json)?.slice(0, 160) : undefined,
  });

  const done = await req("POST", "/api/saas/onboarding/complete", { cookie, token, body: {} });
  const tenant = done.json?.tenant ?? create.json?.tenant;
  record(`${label}.onboard_complete`, Boolean(done.status === 200 && tenant?.id), {
    status: done.status,
    ms: done.ms,
    tenantId: tenant?.id,
  });
  if (!tenant?.id) return null;
  return { email, password, token, cookie, userId, tenant };
}

export function writeModuleEvidence(moduleId, results, extra = {}) {
  fs.mkdirSync(MODULES_OUT, { recursive: true });
  const stamp = new Date().toISOString();
  const fail = results.filter((r) => !r.ok).length;
  const summary = {
    module: moduleId,
    tag: "module_cert_http_live",
    timestamp: stamp,
    baseUrl: base,
    totals: { pass: results.filter((r) => r.ok).length, fail, flows: results.length },
    results,
    hash: createHash("sha256").update(JSON.stringify(results)).digest("hex").slice(0, 16),
    decision: fail === 0 ? "CERTIFIED" : "FAIL",
    ...extra,
  };
  if (extra.forceBlockedExternal) {
    summary.decision = "BLOCKED_EXTERNAL";
    summary.blocker = extra.blocker;
  }
  fs.writeFileSync(path.join(MODULES_OUT, `${moduleId}_latest.json`), JSON.stringify(summary, null, 2));
  fs.writeFileSync(
    path.join(MODULES_OUT, `${moduleId}_${stamp.replace(/[:.]/g, "-")}.json`),
    JSON.stringify(summary, null, 2),
  );
  fs.writeFileSync(
    path.join(MODULES_OUT, `${moduleId}.md`),
    `# Módulo: ${moduleId} — ${summary.decision}\n\n` +
      `> ${stamp} · ${base}\n\n` +
      `## Totals\nPASS ${summary.totals.pass} / FAIL ${summary.totals.fail} / flows ${summary.totals.flows}\n\n` +
      `## Evidencia\n\`${moduleId}_latest.json\`\n\n` +
      (extra.blocker ? `## Blocker\n${extra.blocker}\n\n` : "") +
      `## Decisión final\n**${summary.decision === "CERTIFIED" ? "✅ CERTIFIED" : summary.decision}**\n`,
  );
  console.log(`\n=== ${moduleId} → ${summary.decision} ===`);
  console.log(JSON.stringify(summary.totals));
  return summary;
}
