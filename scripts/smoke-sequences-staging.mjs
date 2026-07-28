#!/usr/bin/env node
/** Sequences smoke — no mass send. */
import { pathToFileURL } from "node:url";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";

const helpersPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "lib", "live-http-cert-helpers.mjs");
const { makeRecorder, req, registerAndOnboard, base } = await import(pathToFileURL(helpersPath).href);
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), "docs", "evidence", "os-saas-e2e", "modules");
fs.mkdirSync(OUT, { recursive: true });

const { results, record } = makeRecorder();
const h = await req("GET", "/api/health");
record("http.health", h.status === 200, { status: h.status });
const a = await registerAndOnboard(record, "seqSmoke");
if (!a) process.exit(1);

const list = await req("GET", "/api/saas/sequences", { cookie: a.cookie, token: a.token });
record("seq.list", list.status === 200, {
  status: list.status,
  ses_configured: list.json?.ses_configured,
  count: Array.isArray(list.json?.sequences) ? list.json.sequences.length : null,
});
record("seq.ses_flag", typeof list.json?.ses_configured === "boolean", {
  ses_configured: list.json?.ses_configured,
});

const create = await req("POST", "/api/saas/sequences", {
  cookie: a.cookie,
  token: a.token,
  body: { name: "Smoke Seq", trigger_type: "manual", status: "draft" },
});
record("seq.create_draft", create.status === 201 || create.status === 200, {
  status: create.status,
  id: create.json?.sequence?.id ?? create.json?.id,
  error: ![200, 201].includes(create.status) ? JSON.stringify(create.json)?.slice(0, 200) : undefined,
});

const unauth = await req("GET", "/api/saas/sequences");
record("seq.401", unauth.status === 401, { status: unauth.status });

const fail = results.filter((r) => !r.ok).length;
const summary = {
  module: "saas.sequences.smoke_staging",
  timestamp: new Date().toISOString(),
  baseUrl: base,
  totals: { pass: results.filter((r) => r.ok).length, fail, flows: results.length },
  results,
  decision: fail === 0 ? "PASS" : "FAIL",
  note: "no mass-send; draft create only",
};
fs.writeFileSync(path.join(OUT, "saas.sequences.smoke_staging_latest.json"), JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary.totals), summary.decision);
process.exit(fail === 0 ? 0 : 1);
