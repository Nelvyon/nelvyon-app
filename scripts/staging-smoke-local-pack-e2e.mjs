/**
 * Staging E2E — Local Growth Pack production pilot.
 * Usage: node scripts/staging-smoke-local-pack-e2e.mjs [--skip-wait]
 *
 * Flow: operator login → POST kickoff → portal invite → portal login → 5 deliverables sin mock://
 */
const BASE = "https://ideal-victory-staging.up.railway.app";
const BACKEND_API =
  process.env.STAGING_BACKEND_API?.trim() || "https://nelvyon-app-production.up.railway.app";
const QA_EMAIL = "qa-audit-20260612@nelvyon.test";
const QA_PASSWORD = "StagingQA2026!";
const SKIP_WAIT = process.argv.includes("--skip-wait");

const RUN_ID = `local-e2e-${Date.now()}`;
const PORTAL_EMAIL = `portal-local-${RUN_ID}@nelvyon.test`;
const PORTAL_PASSWORD = "PortalLocalQA2026!";
const BUSINESS_NAME = `QA Local ${RUN_ID}`;

const EXPECTED_TITLES = [
  "Landing web local",
  "Auditoría SEO local",
  "Chatbot de citas",
  "Campaña email de bienvenida",
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
  if (value && typeof value === "object") {
    return Object.values(value).some(containsMock);
  }
  return false;
}

async function waitForDeploy() {
  if (SKIP_WAIT) {
    console.log("SKIP deploy wait");
    return;
  }
  console.log("Waiting for staging deploy (local pack E2E)…");
  for (let i = 1; i <= 12; i += 1) {
    try {
      const health = await fetch(`${BASE}/api/health/live`, { cache: "no-store" });
      const kickoff = await fetch(`${BASE}/api/os/packs/local-business-growth/kickoff`, {
        method: "OPTIONS",
        cache: "no-store",
      }).catch(() => null);
      const liveRoute = await fetch(`${BASE}/api/packs/local/live/smoke-probe`, { cache: "no-store" });
      console.log(
        JSON.stringify({
          attempt: i,
          health: health.status,
          kickoff: kickoff?.status ?? "n/a",
          liveRoute: liveRoute.status,
        }),
      );
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

async function login() {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: QA_EMAIL, password: QA_PASSWORD }),
  });
  if (!res.ok) throw new Error(`Login ${res.status}`);
  const data = await res.json();
  pass("auth", "operator login", `userId=${data.userId}`);
  return data.token;
}

async function getWorkspaceId(token) {
  const res = await fetch(`${BASE}/api/platform/workspaces/list`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Workspaces ${res.status}`);
  const list = await res.json();
  const ws = Array.isArray(list) ? list[0] : list?.items?.[0];
  if (!ws?.id) return null;
  pass("auth", "workspace", `id=${ws.id}`);
  return ws.id;
}

async function resolveApiBase(path, token, workspaceId, method = "GET", body) {
  const headers = {
    Authorization: `Bearer ${token}`,
    Cookie: `${COOKIE}=${token}`,
    Accept: "application/json",
    "X-Workspace-Id": String(workspaceId),
  };
  if (body) headers["Content-Type"] = "application/json";

  let res = await fetch(`${BASE}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  if (res.status !== 404) return { res, base: BASE };

  res = await fetch(`${BACKEND_API}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  return { res, base: BACKEND_API };
}

async function kickoffLocalPack(token, workspaceId) {
  const payload = {
    business_name: BUSINESS_NAME,
    sector: "restaurant",
    city: "Madrid",
    country: "ES",
    value_proposition: "Cocina mediterránea de autor en el centro",
    primary_cta: "Reservar mesa",
    contact_email: PORTAL_EMAIL,
    contact_name: "Cliente Portal QA",
  };

  const { res, base } = await resolveApiBase(
    "/api/os/packs/local-business-growth/kickoff",
    token,
    workspaceId,
    "POST",
    payload,
  );

  if (!res.ok) {
    const err = await res.text();
    fail("kickoff", "POST local-business-growth", `HTTP ${res.status} ${err.slice(0, 200)}`);
    return null;
  }

  const run = await res.json();
  pass("kickoff", "POST", `run=${run.id} status=${run.status} via ${base}`);
  return run;
}

async function pollPackRun(token, workspaceId, runId) {
  for (let i = 1; i <= 20; i += 1) {
    const { res } = await resolveApiBase(
      `/api/os/packs/local-business-growth/${runId}`,
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
  const base = BASE;
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
  pass("portal", "create invite", `email=${email} via ${base}`);
  return invite;
}

async function acceptPortalInvite(inviteToken) {
  for (const base of [BASE, BACKEND_API]) {
    const res = await fetch(`${base}/api/v1/portal/auth/accept-invite`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: inviteToken,
        password: PORTAL_PASSWORD,
        name: "Cliente Portal QA",
      }),
    });
    if (res.status === 404) continue;
    if (!res.ok) {
      const err = await res.text();
      fail("portal", "accept invite", `HTTP ${res.status} ${err.slice(0, 200)}`);
      return null;
    }
    const auth = await res.json();
    pass("portal", "accept invite", `via ${base}`);
    return { token: auth.access_token, base };
  }
  fail("portal", "accept invite", "HTTP 404 on web and backend");
  return null;
}

async function portalLogin() {
  for (const base of [BASE, BACKEND_API]) {
    const res = await fetch(`${base}/api/v1/portal/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: PORTAL_EMAIL, password: PORTAL_PASSWORD }),
    });
    if (res.status === 404) continue;
    if (!res.ok) {
      fail("portal", "login", `HTTP ${res.status}`);
      return null;
    }
    const auth = await res.json();
    pass("portal", "login", `via ${base}`);
    return { token: auth.access_token, base };
  }
  fail("portal", "login", "HTTP 404");
  return null;
}

async function verifyPortalDeliverables(portalToken, portalBase, projectId) {
  const res = await fetch(
    `${portalBase}/api/v1/portal/deliverables?project_id=${projectId}&page_size=50`,
    { headers: { Authorization: `Bearer ${portalToken}`, Accept: "application/json" } },
  );
  if (!res.ok) {
    fail("portal", "deliverables", `HTTP ${res.status}`);
    return;
  }
  const data = await res.json();
  const items = data.items ?? [];
  pass("portal", "deliverables count", String(items.length));

  for (const title of EXPECTED_TITLES) {
    const found = items.find((d) => d.title === title || d.title?.includes(title.slice(0, 12)));
    if (!found) {
      fail("portal", `deliverable:${title}`, "missing");
      continue;
    }
    pass("portal", `deliverable:${title}`, found.status ?? "present");
    const blob = JSON.stringify(found);
    if (containsMock(blob)) {
      fail("portal", `no-mock:${title}`, "contains mock://");
    } else {
      pass("portal", `no-mock:${title}`, "clean");
    }
  }

  const report = items.find((d) => d.title?.includes("Informe"));
  if (report?.pack_summary || report?.pack_id) {
    pass("portal", "pack_summary", report.pack_summary?.summary?.slice(0, 40) ?? report.pack_id);
  } else {
    warn("portal", "pack_summary", "informe sin pack_summary en payload");
  }
}

async function verifyLiveAssets(slug) {
  const landing = await fetch(`${BASE}/api/packs/local/live/${slug}`, { cache: "no-store" });
  if (landing.status === 200) {
    const html = await landing.text();
    if (html.includes(BUSINESS_NAME)) pass("assets", "landing live", `slug=${slug}`);
    else warn("assets", "landing live", "HTML 200 but business name not found");
  } else {
    fail("assets", "landing live", `HTTP ${landing.status}`);
  }

  const bot = await fetch(`${BASE}/api/packs/local/bot/${slug}`, { cache: "no-store" });
  if (bot.status === 200) pass("assets", "bot live", `slug=${slug}`);
  else fail("assets", "bot live", `HTTP ${bot.status}`);

  const seo = await fetch(`${BASE}/api/packs/local/seo/${slug}/report`, { cache: "no-store" });
  if (seo.status === 200) {
    const report = await seo.json();
    if (report.production) pass("assets", "seo report", `keywords=${report.keywords_geo?.length ?? 0}`);
    else warn("assets", "seo report", "missing production flag");
  } else {
    fail("assets", "seo report", `HTTP ${seo.status}`);
  }
}

async function main() {
  console.log(`Local Pack E2E → ${BASE}\n`);
  await waitForDeploy();

  const token = await login();
  const workspaceId = await getWorkspaceId(token);
  if (!workspaceId) {
    fail("auth", "workspace", "missing");
    process.exit(1);
  }

  console.log("\n=== Kickoff Local Pack ===");
  const run = await kickoffLocalPack(token, workspaceId);
  if (!run) process.exit(1);

  const finalRun = await pollPackRun(token, workspaceId, run.id);
  if (!finalRun) process.exit(1);

  if (finalRun.status === "failed") {
    fail("kickoff", "status", finalRun.error_message ?? "failed");
    process.exit(1);
  }
  if (finalRun.status === "needs_review") {
    warn("kickoff", "status", "needs_review — continuing portal checks");
  } else {
    pass("kickoff", "status", finalRun.status);
  }

  const osClientId = finalRun.os_client_id;
  const osProjectId = finalRun.os_project_id;
  if (!osClientId || !osProjectId) {
    fail("kickoff", "os ids", "missing os_client_id or os_project_id");
    process.exit(1);
  }

  const slug = BUSINESS_NAME.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);

  console.log("\n=== Live assets ===");
  await verifyLiveAssets(slug);

  console.log("\n=== Portal invite + login ===");
  const invite = await createPortalInvite(token, workspaceId, osClientId, PORTAL_EMAIL);
  if (!invite) process.exit(1);

  let portalAuth = await acceptPortalInvite(invite.token);
  if (!portalAuth) {
    portalAuth = await portalLogin();
  }
  if (!portalAuth) process.exit(1);

  console.log("\n=== Portal deliverables ===");
  await verifyPortalDeliverables(portalAuth.token, portalAuth.base, osProjectId);

  console.log("\n=== SUMMARY ===");
  if (WARN.length) console.log(`WARNINGS: ${WARN.length}`);
  if (CRITICAL.length === 0) {
    console.log("ALL_CRITICAL_PASS");
    process.exit(0);
  }
  console.log(`CRITICAL_FAILS: ${CRITICAL.length}`);
  for (const f of CRITICAL) console.log(`  [${f.module}] ${f.check}: ${f.detail}`);
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
