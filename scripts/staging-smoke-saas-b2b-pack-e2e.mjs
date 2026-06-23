/**
 * Staging E2E — SaaS B2B Growth Pack production pilot.
 * Usage: node scripts/staging-smoke-saas-b2b-pack-e2e.mjs [--skip-wait]
 *
 * Flow: operator login → POST kickoff → CEO metrics BFF → portal invite → portal login → 6 deliverables sin mock://
 */
const BASE = "https://ideal-victory-staging.up.railway.app";
const BACKEND_API =
  process.env.STAGING_BACKEND_API?.trim() || "https://nelvyon-app-production.up.railway.app";
const QA_EMAIL = "qa-audit-20260612@nelvyon.test";
const QA_PASSWORD = "StagingQA2026!";
const SKIP_WAIT = process.argv.includes("--skip-wait");

const RUN_ID = `saas-b2b-e2e-${Date.now()}`;
const PORTAL_EMAIL = `portal-saas-${RUN_ID}@nelvyon.test`;
const PORTAL_PASSWORD = "PortalSaasQA2026!";
const BUSINESS_NAME = `QA SaaS ${RUN_ID}`;

const EXPECTED_TITLES = [
  "Landing product-led",
  "SEO demand gen",
  "Bot de demo / calificación",
  "Secuencia nurture B2B",
  "Playbook outbound / ABM",
  "Informe ejecutivo",
];

/** Contract for GET /api/platform/packs/saas-b2b-growth/ceo-metrics */
const EXPECTED_CEO_METRIC_KEYS = [
  "mqls",
  "trial_demo_leads",
  "demos_booked",
  "pipeline_opportunities",
  "nurture_sequence_status",
];

const EXPECTED_CEO_LABELS = {
  mqls: "MQLs",
  trial_demo_leads: "Leads trial/demo",
  demos_booked: "Demos agendadas",
  pipeline_opportunities: "Pipeline",
  nurture_sequence_status: "Secuencia nurture",
};

const CEO_LIMITATION_MARKERS = {
  mqls: ["CRM", "crm", "MQL"],
  trial_demo_leads: ["trial", "demo", "CRM", "aproximado"],
  demos_booked: ["Reservas", "reservas", "demo", "Calendly"],
  pipeline_opportunities: ["pipeline", "CRM", "deals", "forecast"],
  nurture_sequence_status: ["nurture", "campaña", "email", "secuencia"],
};

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
  console.log("Waiting for staging deploy (SaaS B2B pack E2E)…");
  for (let i = 1; i <= 12; i += 1) {
    try {
      const health = await fetch(`${BASE}/api/health/live`, { cache: "no-store" });
      const kickoff = await fetch(`${BASE}/api/os/packs/saas-b2b-growth/kickoff`, {
        method: "OPTIONS",
        cache: "no-store",
      }).catch(() => null);
      const liveRoute = await fetch(`${BASE}/api/packs/saas-b2b/live/smoke-probe`, { cache: "no-store" });
      const ceoMetricsRoute = await fetch(`${BASE}/api/platform/packs/saas-b2b-growth/ceo-metrics`, {
        cache: "no-store",
      });
      console.log(
        JSON.stringify({
          attempt: i,
          health: health.status,
          kickoff: kickoff?.status ?? "n/a",
          liveRoute: liveRoute.status,
          ceoMetricsRoute: ceoMetricsRoute.status,
        }),
      );
      if (health.status === 200 && ceoMetricsRoute.status !== 404) {
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

async function kickoffSaasB2bPack(token, workspaceId) {
  const payload = {
    business_name: BUSINESS_NAME,
    sector: "saas_b2b",
    city: "Madrid",
    country: "ES",
    value_proposition: "Analytics para equipos de producto B2B",
    primary_cta: "Solicitar demo",
    icp_title: "VP Product en SaaS B2B",
    contact_email: PORTAL_EMAIL,
    contact_name: "Cliente Portal QA",
    sales_motion: "hybrid",
    pricing_model: "subscription",
  };

  const { res, base } = await resolveApiBase(
    "/api/os/packs/saas-b2b-growth/kickoff",
    token,
    workspaceId,
    "POST",
    payload,
  );

  if (!res.ok) {
    const err = await res.text();
    fail("kickoff", "POST saas-b2b-growth", `HTTP ${res.status} ${err.slice(0, 200)}`);
    return null;
  }

  const run = await res.json();
  pass("kickoff", "POST", `run=${run.id} status=${run.status} via ${base}`);
  return run;
}

function buildCeoMetricsPath(report) {
  const kpis = report?.kpis ?? {};
  const qs = new URLSearchParams();
  if (kpis.saas_campaign_id) qs.set("campaign_id", String(kpis.saas_campaign_id));
  if (kpis.nurture_email_status) qs.set("nurture_status", String(kpis.nurture_email_status));
  if (kpis.nurture_touches != null) qs.set("nurture_touches", String(kpis.nurture_touches));
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return `/api/platform/packs/saas-b2b-growth/ceo-metrics${suffix}`;
}

async function verifySaasB2bCeoMetrics(token, workspaceId, finalRun) {
  const path = buildCeoMetricsPath(finalRun.report);
  const { res, base } = await resolveApiBase(path, token, workspaceId);

  if (res.status === 404) {
    fail("ceo-metrics", "GET route", `HTTP 404 — missing BFF at ${path}`);
    return;
  }
  if (res.status >= 500) {
    const err = await res.text();
    fail("ceo-metrics", "GET route", `HTTP ${res.status} ${err.slice(0, 200)}`);
    return;
  }
  if (!res.ok) {
    const err = await res.text();
    fail("ceo-metrics", "GET route", `HTTP ${res.status} ${err.slice(0, 200)}`);
    return;
  }

  let payload;
  try {
    payload = await res.json();
  } catch (e) {
    fail("ceo-metrics", "JSON", String(e));
    return;
  }

  pass("ceo-metrics", "GET", `HTTP 200 via ${base}`);

  if (!Array.isArray(payload.metrics)) {
    fail("ceo-metrics", "metrics array", "missing metrics[]");
    return;
  }
  if (payload.metrics.length !== EXPECTED_CEO_METRIC_KEYS.length) {
    fail(
      "ceo-metrics",
      "metrics count",
      `expected ${EXPECTED_CEO_METRIC_KEYS.length}, got ${payload.metrics.length}`,
    );
    return;
  }
  pass("ceo-metrics", "metrics count", String(payload.metrics.length));

  if (!payload.fetched_at) {
    fail("ceo-metrics", "fetched_at", "missing timestamp");
  } else {
    pass("ceo-metrics", "fetched_at", payload.fetched_at.slice(0, 19));
  }

  for (const key of EXPECTED_CEO_METRIC_KEYS) {
    const metric = payload.metrics.find((m) => m?.key === key);
    if (!metric) {
      fail("ceo-metrics", `metric:${key}`, "missing");
      continue;
    }

    const expectedLabel = EXPECTED_CEO_LABELS[key];
    if (metric.label !== expectedLabel) {
      fail("ceo-metrics", `label:${key}`, `expected "${expectedLabel}", got "${metric.label}"`);
    } else {
      pass("ceo-metrics", `label:${key}`, metric.label);
    }

    if (typeof metric.value !== "string" || !metric.value.trim()) {
      fail("ceo-metrics", `value:${key}`, "empty or missing");
    } else {
      pass("ceo-metrics", `value:${key}`, metric.value);
    }

    if (typeof metric.hint !== "string" || metric.hint.trim().length < 8) {
      fail("ceo-metrics", `hint:${key}`, "missing or too short");
    } else {
      pass("ceo-metrics", `hint:${key}`, "present");
    }

    const limitation = typeof metric.limitation === "string" ? metric.limitation.trim() : "";
    if (limitation.length < 12) {
      fail("ceo-metrics", `limitation:${key}`, "missing or too short");
      continue;
    }
    const markers = CEO_LIMITATION_MARKERS[key] ?? [];
    const hasMarker = markers.some((needle) => limitation.toLowerCase().includes(needle.toLowerCase()));
    if (!hasMarker) {
      fail("ceo-metrics", `limitation:${key}`, `unexpected text: ${limitation.slice(0, 80)}`);
    } else {
      pass("ceo-metrics", `limitation:${key}`, limitation.slice(0, 56));
    }

    if (typeof metric.available !== "boolean") {
      fail("ceo-metrics", `available:${key}`, "must be boolean");
    }
  }

  const keys = payload.metrics.map((m) => m?.key).filter(Boolean);
  if (keys.join(",") !== EXPECTED_CEO_METRIC_KEYS.join(",")) {
    fail("ceo-metrics", "metrics order", `got [${keys.join(", ")}]`);
  } else {
    pass("ceo-metrics", "metrics order", "canonical");
  }
}

async function pollPackRun(token, workspaceId, runId) {
  for (let i = 1; i <= 20; i += 1) {
    const { res } = await resolveApiBase(
      `/api/os/packs/saas-b2b-growth/${runId}`,
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

async function verifyPortalDeliverables(portalToken, portalBase, projectId) {
  const res = await fetch(
    `${portalBase}/api/platform/portal/deliverables?project_id=${projectId}&page_size=50`,
    { headers: { Authorization: `Bearer ${portalToken}`, Accept: "application/json" } },
  );
  if (!res.ok) {
    fail("portal", "deliverables", `HTTP ${res.status}`);
    return [];
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
  return items;
}

async function verifyPortalBffFlows(portalToken, portalBase, projectId, items) {
  const headers = {
    Authorization: `Bearer ${portalToken}`,
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  const api = (path) => `${portalBase}/api/platform/portal${path}`;

  const me = await fetch(api("/me"), { headers });
  if (me.ok) pass("portal-bff", "GET /me", "ok");
  else fail("portal-bff", "GET /me", `HTTP ${me.status}`);

  const projects = await fetch(api("/projects"), { headers });
  if (projects.ok) {
    const pdata = await projects.json();
    pass("portal-bff", "GET /projects", `total=${pdata.total ?? pdata.items?.length ?? 0}`);
  } else {
    fail("portal-bff", "GET /projects", `HTTP ${projects.status}`);
  }

  const project = await fetch(api(`/projects/${projectId}`), { headers });
  if (project.ok) pass("portal-bff", "GET /projects/:id", "ok");
  else fail("portal-bff", "GET /projects/:id", `HTTP ${project.status}`);

  const published = items.filter((d) => d.status === "published");
  const sample = published[0] ?? items[0];
  if (!sample?.id) {
    fail("portal-bff", "deliverable sample", "no deliverables to exercise BFF");
    return;
  }

  const detail = await fetch(api(`/deliverables/${sample.id}`), { headers });
  if (detail.ok) pass("portal-bff", "GET /deliverables/:id", sample.title ?? sample.id);
  else fail("portal-bff", "GET /deliverables/:id", `HTTP ${detail.status}`);

  const download = await fetch(api(`/deliverables/${sample.id}/download`), {
    headers: { Authorization: `Bearer ${portalToken}` },
    redirect: "manual",
  });
  if (download.status === 302 || download.status === 200) {
    pass("portal-bff", "GET /deliverables/:id/download", `HTTP ${download.status}`);
  } else if (download.status === 404) {
    warn("portal-bff", "GET /deliverables/:id/download", "HTTP 404 — no file on sample");
  } else {
    fail("portal-bff", "GET /deliverables/:id/download", `HTTP ${download.status}`);
  }

  const toApprove = published.find((d) => d.title?.includes("Informe")) ?? published[0];
  if (toApprove) {
    const approve = await fetch(api(`/deliverables/${toApprove.id}/approve`), {
      method: "POST",
      headers,
      body: JSON.stringify({ feedback: "Smoke QA approve" }),
    });
    if (approve.ok) pass("portal-bff", "POST /deliverables/:id/approve", toApprove.title ?? toApprove.id);
    else fail("portal-bff", "POST /deliverables/:id/approve", `HTTP ${approve.status}`);
  }

  const toReject = published.find((d) => d.id !== toApprove?.id && d.title?.includes("SEO"));
  if (toReject) {
    const reject = await fetch(api(`/deliverables/${toReject.id}/reject`), {
      method: "POST",
      headers,
      body: JSON.stringify({ feedback: "Smoke QA — solicitar ajuste menor" }),
    });
    if (reject.ok) pass("portal-bff", "POST /deliverables/:id/reject", toReject.title ?? toReject.id);
    else fail("portal-bff", "POST /deliverables/:id/reject", `HTTP ${reject.status}`);
  } else {
    warn("portal-bff", "POST /deliverables/:id/reject", "no second published deliverable for reject");
  }
}

async function verifyLiveAssets(slug) {
  const landing = await fetch(`${BASE}/api/packs/saas-b2b/live/${slug}`, { cache: "no-store" });
  if (landing.status === 200) {
    const html = await landing.text();
    if (html.includes(BUSINESS_NAME)) pass("assets", "landing live", `slug=${slug}`);
    else warn("assets", "landing live", "HTML 200 but business name not found");
  } else {
    fail("assets", "landing live", `HTTP ${landing.status}`);
  }

  const bot = await fetch(`${BASE}/api/packs/saas-b2b/bot/${slug}`, { cache: "no-store" });
  if (bot.status === 200) pass("assets", "bot live", `slug=${slug}`);
  else fail("assets", "bot live", `HTTP ${bot.status}`);

  const seo = await fetch(`${BASE}/api/packs/saas-b2b/seo/${slug}/report`, { cache: "no-store" });
  if (seo.status === 200) {
    const report = await seo.json();
    if (report.production) pass("assets", "seo report", `keywords=${report.keywords_demand_gen?.length ?? 0}`);
    else warn("assets", "seo report", "missing production flag");
  } else {
    fail("assets", "seo report", `HTTP ${seo.status}`);
  }

  const playbook = await fetch(`${BASE}/api/packs/saas-b2b/playbook/${slug}`, { cache: "no-store" });
  if (playbook.status === 200) {
    const data = await playbook.json();
    if (data.production) pass("assets", "playbook", `sequences=${data.sequences?.length ?? 0}`);
    else warn("assets", "playbook", "missing production flag");
  } else {
    fail("assets", "playbook", `HTTP ${playbook.status}`);
  }
}

async function main() {
  console.log(`SaaS B2B Pack E2E → ${BASE}\n`);
  await waitForDeploy();

  const token = await login();
  const workspaceId = await getWorkspaceId(token);
  if (!workspaceId) {
    fail("auth", "workspace", "missing");
    process.exit(1);
  }

  console.log("\n=== Kickoff SaaS B2B Pack ===");
  const run = await kickoffSaasB2bPack(token, workspaceId);
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

  console.log("\n=== CEO metrics (post-kickoff) ===");
  await verifySaasB2bCeoMetrics(token, workspaceId, finalRun);

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
  const deliverables = await verifyPortalDeliverables(portalAuth.token, portalAuth.base, osProjectId);

  console.log("\n=== Portal BFF (me/projects/approve/reject/download) ===");
  await verifyPortalBffFlows(portalAuth.token, portalAuth.base, osProjectId, deliverables);

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
