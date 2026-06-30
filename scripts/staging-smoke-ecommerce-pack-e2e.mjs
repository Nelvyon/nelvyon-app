/**
 * Staging E2E — Ecommerce Growth Pack production pilot.
 * Usage: node scripts/staging-smoke-ecommerce-pack-e2e.mjs [--skip-wait]
 *
 * Flow: operator login → POST kickoff → poll → portal invite → accept → login → deliverables sin mock://
 */
const BASE = process.env.STAGING_BASE_URL?.trim() || "https://nelvyon.com";
const BACKEND_API =
  process.env.STAGING_BACKEND_API?.trim() || "https://nelvyon-app-production.up.railway.app";
const QA_EMAIL = "qa-audit-20260612@nelvyon.test";
const QA_PASSWORD = "StagingQA2026!";
const SKIP_WAIT = process.argv.includes("--skip-wait");
const PACK_ID = "ecommerce-growth";

const RUN_ID = `ecommerce-e2e-${Date.now()}`;
const PORTAL_EMAIL = `portal-ecommerce-${RUN_ID}@nelvyon.test`;
const PORTAL_PASSWORD = "PortalEcommerceQA2026!";
const BUSINESS_NAME = `QA Ecommerce ${RUN_ID}`;

const EXPECTED_TITLES = [
  "Landing tienda ecommerce",
  "Auditoría SEO catálogo",
  "Chatbot de ventas",
  "Kit campañas Meta Ads",
  "Informe ejecutivo ecommerce",
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
  if (SKIP_WAIT) {
    console.log("SKIP deploy wait");
    return;
  }
  console.log("Waiting for staging deploy (ecommerce pack E2E)…");
  for (let i = 1; i <= 12; i += 1) {
    try {
      const health = await fetch(`${BASE}/api/health/live`, { cache: "no-store" });
      if (health.status === 200) {
        console.log("DEPLOY_READY");
        return;
      }
    } catch (e) {
      console.log(JSON.stringify({ attempt: i, error: String(e) }));
    }
    await sleep(15000);
  }
  warn("deploy", "wait", "timeout — running E2E anyway");
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
    business_name: BUSINESS_NAME,
    city: "Barcelona",
    country: "ES",
    sector: "ecommerce",
    product_category: "moda sostenible",
    value_proposition: "moda sostenible DTC",
    primary_cta: "comprar ahora",
    contact_email: PORTAL_EMAIL,
    contact_name: "Cliente Portal QA",
  };

  const { res, base } = await resolveApiBase(
    `/api/os/packs/${PACK_ID}/kickoff`,
    token,
    workspaceId,
    "POST",
    payload,
  );

  if (!res.ok) {
    const err = await res.text();
    fail("kickoff", "post-kickoff", `HTTP ${res.status} ${err.slice(0, 200)}`);
    return null;
  }

  const run = await res.json();
  if (containsMock(run)) {
    fail("kickoff", "no-mock", "response contains mock://");
    return null;
  }
  pass("kickoff", "post-kickoff", `run=${run.id} status=${run.status} via ${base}`);
  return run;
}

async function pollPackRun(token, workspaceId, runId) {
  for (let i = 1; i <= 20; i += 1) {
    const { res } = await resolveApiBase(
      `/api/os/packs/${PACK_ID}/${runId}`,
      token,
      workspaceId,
    );
    if (res.ok) {
      const run = await res.json();
      console.log(JSON.stringify({ poll: i, status: run.status, steps: run.steps?.length }));
      if (run.status === "completed" || run.status === "needs_review" || run.status === "failed") {
        return run;
      }
    }
    await sleep(3000);
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
  const titles = items.map((d) => d.title ?? d.name ?? "");
  for (const expected of EXPECTED_TITLES) {
    if (titles.some((t) => t.toLowerCase().includes(expected.toLowerCase().split(" ")[0]))) {
      pass("deliverables", `present:${expected}`);
    } else {
      warn("deliverables", `missing:${expected}`, `got: ${titles.join(", ")}`);
    }
  }
  if (containsMock(body)) fail("deliverables", "no-mock", "deliverables contain mock://");
  else pass("deliverables", "no-mock");
}

async function main() {
  console.log(`\n=== Ecommerce Growth Pack E2E smoke [${RUN_ID}] ===\n`);
  await waitForDeploy();

  const opToken = await operatorLogin();
  if (!opToken) {
    printSummary();
    process.exit(1);
  }

  const workspaceId = await getWorkspaceId(opToken);

  console.log("\n=== Kickoff Ecommerce Pack ===");
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

  if (finalRun.status === "failed") {
    fail("kickoff", "status", finalRun.error_message ?? "failed");
    printSummary();
    process.exit(1);
  }
  if (finalRun.status === "needs_review") {
    warn("kickoff", "auto-approve", "status=needs_review — continuing");
  } else {
    pass("kickoff", "status", finalRun.status);
  }

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
}

function printSummary() {
  console.log("\n--- Ecommerce Pack E2E Summary ---");
  console.log(`CRITICAL: ${CRITICAL.length}  WARN: ${WARN.length}`);
  for (const c of CRITICAL) console.log(`  FAIL [${c.module}] ${c.check}: ${c.detail}`);
  for (const w of WARN) console.log(`  WARN [${w.module}] ${w.check}: ${w.detail}`);
  console.log(CRITICAL.length === 0 ? "ALL_PASS" : "CRITICAL_FAILS");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
