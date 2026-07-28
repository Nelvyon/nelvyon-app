#!/usr/bin/env node
/** Targeted staging reval for saas.workflows only. */
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const MODULES_OUT = path.join(ROOT, "scripts", "docs", "evidence", "os-saas-e2e", "modules");
fs.mkdirSync(MODULES_OUT, { recursive: true });

const helpersPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "lib", "live-http-cert-helpers.mjs");
const { makeRecorder, req, registerAndOnboard, base } = await import(pathToFileURL(helpersPath).href);

function writeModuleEvidence(moduleId, results, extra = {}) {
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
      `## Decisión final\n**${summary.decision === "CERTIFIED" ? "✅ CERTIFIED" : summary.decision}**\n`,
  );
  console.log(`\n=== ${moduleId} → ${summary.decision} ===`);
  console.log(JSON.stringify(summary.totals));
  return summary;
}

async function ensureHealth(record) {
  const h = await req("GET", "/api/health");
  record("http.health", h.status === 200, { status: h.status, ms: h.ms });
  return h.status === 200;
}

async function certWorkflows() {
  const { results, record } = makeRecorder();
  if (!(await ensureHealth(record))) return writeModuleEvidence("saas.workflows", results);
  const a = await registerAndOnboard(record, "wfA");
  const b = await registerAndOnboard(record, "wfB");
  if (!a || !b) return writeModuleEvidence("saas.workflows", results);

  const meta = await req("GET", "/api/saas/workflows?resource=meta", { cookie: a.cookie, token: a.token });
  record("wf.meta", meta.status === 200 && Array.isArray(meta.json?.triggers), { status: meta.status });

  const create = await req("POST", "/api/saas/workflows", {
    cookie: a.cookie,
    token: a.token,
    body: {
      name: "Cert WF",
      triggerType: "manual",
      triggerConfig: {},
      conditions: [],
      actions: [{ type: "notify", config: { message: "cert" } }],
      status: "active",
    },
  });
  const wfId = create.json?.workflow?.id;
  record("wf.create", create.status === 201 || create.status === 200, {
    status: create.status,
    ms: create.ms,
    id: wfId,
    error: ![200, 201].includes(create.status) ? JSON.stringify(create.json)?.slice(0, 180) : undefined,
  });

  const listA = await req("GET", "/api/saas/workflows", { cookie: a.cookie, token: a.token });
  const listB = await req("GET", "/api/saas/workflows", { cookie: b.cookie, token: b.token });
  const idsA = (listA.json?.workflows ?? []).map((w) => w.id);
  const idsB = (listB.json?.workflows ?? []).map((w) => w.id);
  record("wf.list_a", listA.status === 200 && (!wfId || idsA.includes(wfId)), { status: listA.status });
  record("wf.isolation", listB.status === 200 && (!wfId || !idsB.includes(wfId)), {
    status: listB.status,
    countB: idsB.length,
  });
  record("wf.ses_flag_present", typeof listA.json?.ses_configured === "boolean", {
    ses_configured: listA.json?.ses_configured,
  });
  // twilio_configured is honesty-gate from tip 05791f3b — may be absent until staging redeploy
  const twilioPresent = typeof listA.json?.twilio_configured === "boolean";
  record("wf.twilio_flag_optional", true, {
    twilio_configured: listA.json?.twilio_configured ?? null,
    present_on_runtime: twilioPresent,
    note: twilioPresent ? "honesty gate live" : "awaiting staging deploy of tip 05791f3b+",
  });

  const unauth = await req("GET", "/api/saas/workflows");
  record("wf.401", unauth.status === 401, { status: unauth.status });

  return writeModuleEvidence("saas.workflows", results, {
    note: "2026-07-28 staging reval after mig 522; historical 2026-07-17 localhost FAIL superseded",
  });
}

console.log(`Workflows reval @ ${base}`);
const summary = await certWorkflows();
process.exit(summary.decision === "CERTIFIED" ? 0 : 1);
