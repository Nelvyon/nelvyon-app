/**
 * Staging E2E — SaaS B2B Growth Pack production pilot.
 * Usage: node scripts/staging-smoke-saas-b2b-pack-e2e.mjs [--skip-wait]
 *
 * Flow: operator login → POST kickoff → poll → portal invite → accept → login → deliverables sin mock://
 */
import { installScriptTimeoutGuard } from "./lib/smoke-fetch.mjs";
import { waitForStagingDeploy } from "./lib/wait-for-deploy.mjs";
import { exitSkipIaOff, isLlmNotConfiguredResponse } from "./lib/p0-llm-skip.mjs";

const BASE = process.env.STAGING_BASE_URL?.trim() || "https://ideal-victory-staging.up.railway.app";
const BACKEND_API =
  process.env.STAGING_BACKEND_API?.trim() || "https://ideal-victory-staging.up.railway.app";
const QA_EMAIL = "qa-audit-20260612@nelvyon.test";
const QA_PASSWORD = process.env.STAGING_QA_PASSWORD?.trim() || (process.env.STAGING_QA_ALLOW_DEFAULT === "1" ? "StagingQA2026!" : (() => { throw new Error("STAGING_QA_PASSWORD is required (or STAGING_QA_ALLOW_DEFAULT=1)"); })());
const SKIP_WAIT = process.argv.includes("--skip-wait");
const PACK_ID = "saas-b2b-growth";

const RUN_ID = `saas-b2b-e2e-${Date.now()}`;
const PORTAL_EMAIL = `portal-saas-b2b-${RUN_ID}@nelvyon.test`;
const PORTAL_PASSWORD = "PortalSaasB2bQA2026!";
const PRODUCT_NAME = `QA SaaS B2B ${RUN_ID}`;

const EXPECTED_TITLES = [
  "Landing PLG",
  "Informe SEO B2B",
  "Bot demo",
  "Playbook outbound",
  "Secuencia nurture B2B",
  "Informe ejecutivo",
];

const COOKIE = "nelvyon_token";
const CRITICAL = [];
const WARN = [];

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

async function waitForDeploy() {
  const result = await waitForStagingDeploy(BASE, {
    skipWait: SKIP_WAIT,
    label: "saas-b2b-pack-e2e",
  });
  if (!result.ready) {
    warn("deploy", "wait", "timeout waiting for staging deploy SHA");
  }
}

async function operatorLogin() {
  let lastStatus = 0;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const r = await fetch(`${BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: QA_EMAIL, password: QA_PASSWORD }),
      });
      lastStatus = r.status;
      if (r.ok) {
        const data = await r.json();
        if (!data.token) {
          fail("login", "token", "missing token in response");
          return null;
        }
        pass("login", "operator-login", `userId=${data.userId ?? "?"}`);
        return data.token;
      }
      if (![502, 503, 504].includes(r.status) || attempt === 3) break;
    } catch (e) {
      if (attempt === 3) {
        fail("login", "operator-login", String(e));
        return null;
      }
    }
    await sleep(2000 * (attempt + 1));
  }
  fail("login", "operator-login", `status ${lastStatus}`);
  return null;
}

async function getWorkspaceId(token) {
  const fallback = process.env.QA_WORKSPACE_ID || "1";
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
    /* fall through */
  }
  pass("auth", "workspace", `id=${fallback} (fallback)`);
  return fallback;
}

async function resolveApiBase(path, token, workspaceId, method = "GET", body) {
  const headers = {
    Authorization: `Bearer ${token}`,
    Cookie: `${COOKIE}=${token}`,
    Accept: "application/json",
    "X-Workspace-Id": String(workspaceId),
  };
  if (body) headers["Content-Type"] = "application/json";

  let res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status !== 404) return { res, base: BASE };

  res = await fetch(`${BACKEND_API}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  return { res, base: BACKEND_API };
}

async function kickoffPack(token, workspaceId) {
  const payload = {
    business_name: PRODUCT_NAME,
    city: "Madrid",
    country: "ES",
    sector: "saas_b2b",
    icp_title: "VP Engineering",
    value_proposition: "plataforma PLG freemium para devs",
    primary_cta: "empezar gratis",
    contact_email: PORTAL_EMAIL,
    contact_name: "Cliente Portal QA",
  };

  let res;
  let base = BASE;
  try {
    ({ res, base } = await resolveApiBase(
      `/api/os/packs/${PACK_ID}/kickoff`,
      token,
      workspaceId,
      "POST",
      payload,
    ));
  } catch (e) {
    warn("kickoff", "POST timeout/abort", String(e).slice(0, 180));
    res = null;
  }

  if (res?.ok || res?.status === 202) {
    const run = await res.json();
    if (containsMock(run)) {
      fail("kickoff", "no-mock", "response contains mock://");
      return null;
    }
    pass("kickoff", "post-kickoff", `run=${run.id} status=${run.status} http=${res.status} via ${base}`);
    return run;
  }

  if (res) {
    const err = await res.text();
    if (isLlmNotConfiguredResponse(res.status, err)) {
      exitSkipIaOff("saas-b2b-pack-e2e", res.status, err);
    }
    fail("kickoff", "post-kickoff", `HTTP ${res.status} ${err.slice(0, 200)}`);
  } else {
    fail("kickoff", "post-kickoff", "abort/timeout without 202 recovery");
  }
  return null;
}

async function pollPackRun(token, workspaceId, runId) {
  for (let i = 1; i <= 240; i += 1) {
    const { res } = await resolveApiBase(
      `/api/os/packs/${PACK_ID}/${runId}`,
      token,
      workspaceId,
    );
    if (res.ok) {
      const run = await res.json();
      const stepSummary = (run.steps || [])
        .map((s) => `${s.key}:${s.status}`)
        .join(",");
      console.log(JSON.stringify({ poll: i, status: run.status, steps: stepSummary }));
      if (run.status === "completed" || run.status === "needs_review" || run.status === "failed") {
        return run;
      }
    }
    await sleep(5000);
  }
  fail("kickoff", "poll", "timeout waiting for pack completion");
  return null;
}

async function createPortalInvite(token, workspaceId, clientId, email) {
  const headers = {
    Authorization: `Bearer ${token}`,
    Cookie: `${COOKIE}=${token}`,
    Accept: "application/json",
    "Content-Type": "application/json",
    "X-Workspace-Id": String(workspaceId),
  };
  const res = await fetch(`${BASE}/api/platform/portal/invites`, {
    method: "POST",
    headers,
    body: JSON.stringify({ client_id: clientId, email }),
  });
  if (!res.ok) {
    const err = await res.text();
    fail("portal", "create invite", `HTTP ${res.status} ${err.slice(0, 200)}`);
    return null;
  }
  const invite = await res.json();
  if (!invite.token) {
    fail("portal", "invite token", "missing token in response");
    return null;
  }
  pass("portal", "create invite", `email=${email}`);
  return invite;
}

async function acceptPortalInvite(inviteToken) {
  const res = await fetch(`${BASE}/api/platform/portal/auth/accept-invite`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      token: inviteToken,
      password: PORTAL_PASSWORD,
      name: "Cliente Portal QA",
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    fail("portal", "accept invite", `HTTP ${res.status} ${err.slice(0, 200)}`);
    return null;
  }
  const auth = await res.json();
  pass("portal", "accept invite", "via platform BFF");
  return { token: auth.access_token, base: BASE };
}

async function portalLogin() {
  const res = await fetch(`${BASE}/api/platform/portal/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: PORTAL_EMAIL, password: PORTAL_PASSWORD }),
  });
  if (!res.ok) {
    fail("portal", "login", `HTTP ${res.status}`);
    return null;
  }
  const auth = await res.json();
  pass("portal", "login", "via platform BFF");
  return { token: auth.access_token, base: BASE };
}

async function checkDeliverables(portalToken, projectId) {
  const r = await fetch(
    `${BASE}/api/platform/portal/deliverables?project_id=${projectId}&page_size=50`,
    { headers: { Authorization: `Bearer ${portalToken}`, Accept: "application/json" } },
  );
  if (!r.ok) {
    fail("deliverables", "list", `status ${r.status}`);
    return;
  }
  const body = await r.json();
  const items = body.items ?? body.deliverables ?? [];
  pass("deliverables", "count", String(items.length));

  for (const expected of EXPECTED_TITLES) {
    const found = items.find(
      (d) => d.title === expected || String(d.title ?? "").toLowerCase().includes(expected.toLowerCase().slice(0, 10)),
    );
    if (!found) {
      fail("deliverables", `present:${expected}`, `got: ${items.map((d) => d.title).join(", ")}`);
      continue;
    }
    pass("deliverables", `present:${expected}`, found.status ?? "present");
    if (containsMock(found)) fail("deliverables", `no-mock:${expected}`, "contains mock://");
    else pass("deliverables", `no-mock:${expected}`, "clean");
  }

  const autoApproved = items.filter((d) => d.status === "approved_by_client");
  if (autoApproved.length >= EXPECTED_TITLES.length) {
    pass("deliverables", "auto-approved", `${autoApproved.length} (QA≥85 path)`);
  } else if (autoApproved.length > 0) {
    warn("deliverables", "auto-approved", `${autoApproved.length}/${items.length}`);
  } else {
    fail("deliverables", "auto-approved", "none approved_by_client — expected completed QA≥85");
  }
}

async function main() {
  const clearGuard = installScriptTimeoutGuard(30 * 60 * 1000, "saas-b2b-pack-e2e");
  try {
  console.log(`\n=== SaaS B2B Growth Pack E2E smoke [${RUN_ID}] ===\n`);
  await waitForDeploy();

  const opToken = await operatorLogin();
  if (!opToken) {
    printSummary();
    process.exit(1);
  }

  const workspaceId = await getWorkspaceId(opToken);

  console.log("\n=== Kickoff SaaS B2B Pack ===");
  const run = await kickoffPack(opToken, workspaceId);
  if (!run) {
    printSummary();
    process.exit(1);
  }

  const finalRun = await pollPackRun(opToken, workspaceId, run.id);
  if (!finalRun) {
    printSummary();
    process.exit(1);
  }

  if (finalRun.status !== "completed") {
    fail("kickoff", "status", finalRun.status === "needs_review" ? "needs_review — expected completed" : (finalRun.error_message ?? finalRun.status));
    printSummary();
    process.exit(1);
  }
  pass("kickoff", "status", "completed");

  const osClientId = finalRun.os_client_id;
  const osProjectId = finalRun.os_project_id;
  if (!osClientId || !osProjectId) {
    fail("kickoff", "os ids", "missing os_client_id or os_project_id");
    printSummary();
    process.exit(1);
  }

  console.log("\n=== Portal invite + login ===");
  const invite = await createPortalInvite(opToken, workspaceId, osClientId, PORTAL_EMAIL);
  if (!invite) {
    printSummary();
    process.exit(1);
  }

  let portalAuth = await acceptPortalInvite(invite.token);
  if (!portalAuth) portalAuth = await portalLogin();
  if (!portalAuth) {
    printSummary();
    process.exit(1);
  }

  console.log("\n=== Portal deliverables ===");
  await checkDeliverables(portalAuth.token, osProjectId);

  printSummary();
  process.exit(CRITICAL.length === 0 ? 0 : 1);
  } finally {
    clearGuard();
  }
}

function printSummary() {
  console.log("\n--- SaaS B2B Pack E2E Summary ---");
  console.log(`CRITICAL: ${CRITICAL.length}  WARN: ${WARN.length}`);
  for (const c of CRITICAL) console.log(`  FAIL [${c.module}] ${c.check}: ${c.detail}`);
  for (const w of WARN) console.log(`  WARN [${w.module}] ${w.check}: ${w.detail}`);
  if (CRITICAL.length === 0) {
    console.log("ALL_PASS");
  } else {
    console.log("CRITICAL_FAIL");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
