/**
 * Staging E2E — Strategy / Funnel / Retention OS packs (mesh).
 * Usage: node scripts/staging-smoke-new-os-packs-e2e.mjs [--skip-wait] [--only=strategy|funnel|retention]
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
const ONLY = (process.argv.find((a) => a.startsWith("--only=")) || "").split("=")[1] || "";

const COOKIE = "nelvyon_token";
const CRITICAL = [];
const WARN = [];

const PACKS = [
  {
    key: "strategy",
    packId: "strategy-pack",
    sector: "local",
    titles: ["Landing estrategia", "Plan 90d", "Informe ejecutivo estrategia"],
    payloadExtra: { goals: ["leads", "revenue"], horizon_days: 90 },
  },
  {
    key: "funnel",
    packId: "funnel-growth-pack",
    sector: "ecommerce",
    titles: ["Landing funnel", "Informe CRO funnel", "Mapa funnel", "Informe ejecutivo funnel"],
    payloadExtra: { funnel_steps: 3, offer: "Oferta QA funnel" },
  },
  {
    key: "retention",
    packId: "retention-pack",
    sector: "saas_b2b",
    titles: ["Bot retención", "Secuencia retención", "Reglas churn", "Informe ejecutivo retención"],
    payloadExtra: { cohort: "active_30d", channels: ["email", "crm"], loyalty_goal: "reduce_churn" },
  },
];

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
  const product = `QA ${pack.key} ${runId}`;
  const payload = {
    business_name: product,
    city: "Madrid",
    country: "ES",
    sector: pack.sector,
    value_proposition: `propuesta ${pack.key}`,
    primary_cta: "empezar",
    contact_email: portalEmail,
    contact_name: "Cliente Portal QA",
    ...pack.payloadExtra,
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
    fail(pack.key, "flag", "PACK_FLAG_OFF in staging — expected enabled");
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
    if (final.status === "completed" || final.status === "failed" || final.status === "needs_review") {
      break;
    }
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
    headers: { "Content-Type": "application/json", Accept: "application/json" },
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
  const portalAuth = await portalLogin.json();
  const portalToken = portalAuth.access_token;
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
          .includes(title.toLowerCase().slice(0, 10)),
    );
    if (!found) {
      fail(pack.key, "title", `missing ${title}; got: ${items.map((d) => d.title).join(", ")}`);
      continue;
    }
    if (containsMock(found)) fail(pack.key, "no-mock", title);
    else pass(pack.key, "title", `${title}:${found.status || "ok"}`);
  }

  const approved = items.filter((d) => d.status === "approved_by_client");
  if (approved.length >= pack.titles.length) {
    pass(pack.key, "auto-approve", `${approved.length}`);
  } else if (approved.length > 0) {
    warn(pack.key, "auto-approve", `${approved.length}/${pack.titles.length}`);
  } else {
    fail(pack.key, "auto-approve", "none approved_by_client");
  }
}

async function main() {
  console.log(`=== New OS packs E2E [${BASE}] ===`);
  if (!SKIP_WAIT) {
    await waitForStagingDeploy(BASE, { skipWait: false, label: "new-os-packs-e2e" });
  } else {
    console.log("SKIP wait");
  }
  const token = await operatorLogin();
  if (!token) {
    console.log(`CRITICAL: ${CRITICAL.length}`);
    process.exit(1);
  }
  const workspaceId = await getWorkspaceId(token);
  const selected = ONLY ? PACKS.filter((p) => p.key === ONLY) : PACKS;
  for (const pack of selected) {
    await runOnePack(token, workspaceId, pack);
  }
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
