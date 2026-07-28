#!/usr/bin/env node
/**
 * Read-only staging honesty probes — no mass email, no OAuth connect, no billing mutate.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "scripts", "docs", "evidence", "os-saas-e2e", "modules");
fs.mkdirSync(OUT, { recursive: true });

const helpersPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "lib", "live-http-cert-helpers.mjs");
const { makeRecorder, req, registerAndOnboard, base } = await import(pathToFileURL(helpersPath).href);

const { results, record } = makeRecorder();

const health = await req("GET", "/api/health");
record("http.health", health.status === 200, { status: health.status });

const a = await registerAndOnboard(record, "honA");
if (!a) {
  console.error("onboard failed — abort");
  process.exit(1);
}

async function get(pathName, flow, assertFn) {
  const r = await req("GET", pathName, { cookie: a.cookie, token: a.token });
  const ok = assertFn(r);
  record(flow, ok, {
    status: r.status,
    error: !ok ? JSON.stringify(r.json)?.slice(0, 200) : undefined,
    snippet: typeof r.json === "object" && r.json ? Object.keys(r.json).slice(0, 12) : undefined,
  });
  return r;
}

await get("/api/saas/workflows", "honesty.workflows.ses_twilio_keys", (r) =>
  r.status === 200 && typeof r.json?.ses_configured === "boolean",
);

await get("/api/saas/sequences", "honesty.sequences.ses_flag", (r) =>
  r.status === 200 && (typeof r.json?.ses_configured === "boolean" || Array.isArray(r.json?.sequences)),
);

await get("/api/saas/campanias", "honesty.campanias.ses_flag", (r) =>
  r.status === 200 && typeof r.json?.ses_configured === "boolean",
);

await get("/api/saas/invoices", "honesty.invoices.list", (r) => r.status === 200 || r.status === 404);

await get("/api/saas/documents", "honesty.documents.list", (r) => r.status === 200 || r.status === 404);

await get("/api/saas/analytics", "honesty.analytics", (r) => r.status === 200 || r.status === 401 || r.status === 403);

await get("/api/saas/funnels", "honesty.funnels", (r) =>
  r.status === 200 || r.status === 404 || (r.status >= 400 && r.status < 500),
);

// Unauthenticated should fail closed
const unauth = await req("GET", "/api/saas/campanias");
record("honesty.campanias.401", unauth.status === 401, { status: unauth.status });

const fail = results.filter((r) => !r.ok).length;
const summary = {
  module: "saas.honesty.staging_reval",
  tag: "read_only_honesty",
  timestamp: new Date().toISOString(),
  baseUrl: base,
  totals: { pass: results.filter((r) => r.ok).length, fail, flows: results.length },
  results,
  decision: fail === 0 ? "PASS" : "FAIL",
  constraints: [
    "no mass commercial send",
    "no OAuth connect",
    "no Stripe pause/payout mutate",
    "no AI canary open",
  ],
};
fs.writeFileSync(path.join(OUT, "saas.honesty.staging_reval_latest.json"), JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary.totals), summary.decision);
process.exit(fail === 0 ? 0 : 1);
