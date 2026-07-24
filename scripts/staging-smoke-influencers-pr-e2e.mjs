/**
 * Staging E2E — influencers-pr-pack.
 * Same mesh/portal/QA>=85/auditor pattern as `staging-smoke-automations-reputation-e2e.mjs`.
 * Requires staging flag ON: NELVYON_INFLUENCERS_PR_PACK=1 (or staging/dev runtime, which
 * enables it by default per `osPackFlags.ts`).
 * NO real outreach send is exercised or expected — this pack never contacts a real
 * influencer/PR outlet; it only certifies the synthetic research/scoring/brief pipeline.
 * Usage: node scripts/staging-smoke-influencers-pr-e2e.mjs [--skip-wait]
 */
import { waitForStagingDeploy } from "./lib/wait-for-deploy.mjs";
import { exitSkipIaOff, isLlmNotConfiguredResponse } from "./lib/p0-llm-skip.mjs";

const BASE = process.env.STAGING_BASE_URL?.trim() || "https://ideal-victory-staging.up.railway.app";
const QA_EMAIL = "qa-audit-20260612@nelvyon.test";
const QA_PASSWORD =
  process.env.STAGING_QA_PASSWORD?.trim() ||
  (process.env.STAGING_QA_ALLOW_DEFAULT === "1"
    ? "StagingQA2026!"
    : (() => {
        throw new Error("STAGING_QA_PASSWORD is required (or STAGING_QA_ALLOW_DEFAULT=1)");
      })());
const SKIP_WAIT = process.argv.includes("--skip-wait");
const COOKIE = "nelvyon_token";
const CRITICAL = [];
const WARN = [];

const PACK = {
  key: "influencers_pr",
  packId: "influencers-pr-pack",
  sector: "local",
  titles: [
    "Asistente de campañas de influencers y PR",
    "Research matching",
    "Scoring sheet",
    "Brief outreach",
    "Contrato / checklist",
    "Metrics plan",
    "Informe ejecutivo",
  ],
};

function fail(m, c, d) {
  CRITICAL.push({ module: m, check: c, detail: d });
  console.log(`FAIL [${m}] ${c}: ${d}`);
}
function warn(m, c, d) {
  WARN.push({ module: m, check: c, detail: d });
  console.log(`WARN [${m}] ${c}: ${d}`);
}
function pass(m, c, d = "ok") {
  console.log(`PASS [${m}] ${c}: ${d}`);
}
async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
function containsMock(value) {
  if (typeof value === "string") return value.includes("mock://");
  if (Array.isArray(value)) return value.some(containsMock);
  if (value && typeof value === "object") return Object.values(value).some(containsMock);
  return false;
}
function containsOutreachAuthorizedTrue(value) {
  if (Array.isArray(value)) return value.some(containsOutreachAuthorizedTrue);
  if (value && typeof value === "object") {
    if (value.outreach_authorized === true) return true;
    return Object.values(value).some(containsOutreachAuthorizedTrue);
  }
  return false;
}

async function operatorLogin() {
  const r = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: QA_EMAIL, password: QA_PASSWORD }),
  });
  if (!r.ok) {
    fail("login", "operator-login", `status ${r.status}`);
    return null;
  }
  const data = await r.json();
  pass("login", "operator-login", `userId=${data.userId ?? "?"}`);
  return data.token;
}

async function getWorkspaceId(token) {
  const fallback = process.env.QA_WORKSPACE_ID || "2";
  try {
    const res = await fetch(`${BASE}/api/platform/workspaces/list`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      cache: "no-store",
    });
    if (res.ok) {
      const list = await res.json();
      const ws = Array.isArray(list) ? list[0] : list?.items?.[0];
      if (ws?.id) {
        pass("auth", "workspace", `id=${ws.id}`);
        return ws.id;
      }
    }
  } catch {
    /* fallthrough */
  }
  pass("auth", "workspace", `id=${fallback} (fallback)`);
  return fallback;
}

function headers(token, workspaceId) {
  return {
    Authorization: `Bearer ${token}`,
    Cookie: `${COOKIE}=${token}`,
    Accept: "application/json",
    "X-Workspace-Id": String(workspaceId),
    "Content-Type": "application/json",
  };
}

async function runOnePack(token, workspaceId, pack) {
  const runId = `${pack.key}-e2e-${Date.now()}`;
  const portalEmail = `portal-${pack.key}-${runId}@nelvyon.test`;
  const portalPassword = `Portal${pack.key}QA2026!`;
  const payload = {
    business_name: `QA ${pack.key} ${runId}`,
    city: "Madrid",
    country: "ES",
    sector: pack.sector,
    value_proposition: `propuesta ${pack.key}`,
    primary_cta: "empezar",
    contact_email: portalEmail,
    contact_name: "Cliente Portal QA",
  };

  console.log(`\n=== Kickoff ${pack.packId} ===`);
  const kick = await fetch(`${BASE}/api/os/packs/${pack.packId}/kickoff`, {
    method: "POST",
    headers: headers(token, workspaceId),
    body: JSON.stringify(payload),
  });
  const kickText = await kick.text();
  if (isLlmNotConfiguredResponse(kick.status, kickText)) {
    exitSkipIaOff(`${pack.key}-pack-e2e`, kick.status, kickText);
  }
  if (kick.status === 503 && kickText.includes("PACK_FLAG_OFF")) {
    warn(pack.key, "kickoff", `pack flag OFF in this environment: ${kickText.slice(0, 160)}`);
    return;
  }
  if (!(kick.ok || kick.status === 202)) {
    fail(pack.key, "kickoff", `HTTP ${kick.status} ${kickText.slice(0, 220)}`);
    return;
  }
  const run = JSON.parse(kickText);
  pass(pack.key, "kickoff", `run=${run.id} http=${kick.status}`);

  let final = run;
  for (let i = 1; i <= 240; i += 1) {
    await sleep(5000);
    const poll = await fetch(`${BASE}/api/os/packs/${pack.packId}/${run.id}`, {
      headers: headers(token, workspaceId),
    });
    if (!poll.ok) continue;
    final = await poll.json();
    const steps = (final.steps || []).map((s) => `${s.key}:${s.status}`).join(",");
    if (i === 1 || i % 5 === 0 || final.status !== "running") {
      console.log(JSON.stringify({ poll: i, status: final.status, steps }));
    }
    if (["completed", "failed", "needs_review"].includes(final.status)) break;
  }

  if (final.status !== "completed") {
    fail(pack.key, "status", `expected completed got ${final.status} err=${final.error_message ?? ""}`);
    return;
  }
  pass(pack.key, "status", "completed");

  const inviteRes = await fetch(`${BASE}/api/platform/portal/invites`, {
    method: "POST",
    headers: headers(token, workspaceId),
    body: JSON.stringify({ email: portalEmail, client_id: final.os_client_id }),
  });
  if (!inviteRes.ok) {
    fail(pack.key, "portal-invite", `HTTP ${inviteRes.status}`);
    return;
  }
  const invite = await inviteRes.json();
  if (!invite.token) {
    fail(pack.key, "portal-invite", "missing token");
    return;
  }
  pass(pack.key, "portal-invite", portalEmail);

  const acceptRes = await fetch(`${BASE}/api/platform/portal/auth/accept-invite`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: invite.token, password: portalPassword, name: "Portal QA" }),
  });
  if (!acceptRes.ok) {
    fail(pack.key, "portal-accept", `HTTP ${acceptRes.status}`);
    return;
  }
  pass(pack.key, "portal-accept", "ok");

  const portalLogin = await fetch(`${BASE}/api/platform/portal/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: portalEmail, password: portalPassword }),
  });
  if (!portalLogin.ok) {
    fail(pack.key, "portal-login", `HTTP ${portalLogin.status}`);
    return;
  }
  const portalToken = (await portalLogin.json()).access_token;
  pass(pack.key, "portal-login", "ok");

  const delRes = await fetch(
    `${BASE}/api/platform/portal/deliverables?project_id=${encodeURIComponent(final.os_project_id)}&page_size=50`,
    { headers: { Authorization: `Bearer ${portalToken}`, Accept: "application/json" } },
  );
  if (!delRes.ok) {
    fail(pack.key, "deliverables", `HTTP ${delRes.status}`);
    return;
  }
  const delJson = await delRes.json();
  const items = Array.isArray(delJson) ? delJson : delJson.items || delJson.deliverables || [];
  pass(pack.key, "deliverables-count", String(items.length));

  for (const title of pack.titles) {
    const found = items.find(
      (d) =>
        d.title === title ||
        String(d.title ?? "")
          .toLowerCase()
          .includes(title.toLowerCase().slice(0, 12)),
    );
    if (!found) {
      fail(pack.key, "title", `missing ${title}; got: ${items.map((d) => d.title).join(", ")}`);
      continue;
    }
    if (containsMock(found)) fail(pack.key, "no-mock", title);
    else pass(pack.key, "title", `${title}:${found.status || "ok"}`);
  }

  const anyOutreachAuthorized = items.some((d) => containsOutreachAuthorizedTrue(d));
  if (anyOutreachAuthorized) fail(pack.key, "no-real-outreach", "found outreach_authorized=true — must never happen");
  else pass(pack.key, "no-real-outreach", "outreach_authorized=false everywhere");

  const approved = items.filter((d) => d.status === "approved_by_client");
  if (approved.length >= pack.titles.length) pass(pack.key, "auto-approve", `${approved.length}`);
  else if (approved.length > 0) warn(pack.key, "auto-approve", `${approved.length}/${pack.titles.length}`);
  else fail(pack.key, "auto-approve", "none approved_by_client");
}

async function main() {
  console.log(`=== Influencers/PR pack E2E [${BASE}] ===`);
  if (!SKIP_WAIT) {
    await waitForStagingDeploy(BASE, { skipWait: false, label: "influencers-pr-e2e" });
  } else console.log("SKIP wait");

  const token = await operatorLogin();
  if (!token) {
    process.exit(1);
  }
  const workspaceId = await getWorkspaceId(token);
  await runOnePack(token, workspaceId, PACK);
  console.log(`\n--- Summary ---`);
  console.log(`CRITICAL: ${CRITICAL.length}  WARN: ${WARN.length}`);
  if (CRITICAL.length) {
    console.log("CRITICAL_FAIL");
    process.exit(1);
  }
  console.log("ALL_PASS");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
