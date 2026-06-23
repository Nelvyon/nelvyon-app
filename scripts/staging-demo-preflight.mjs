/**
 * Preflight smoke — ~60 s antes de cada demo en staging.
 *
 * Comprueba: /packs, login, kickoff Local, Analytics Insights (demo), OS catalog.
 *
 * Usage:
 *   node scripts/staging-demo-preflight.mjs
 *   node scripts/staging-demo-preflight.mjs --skip-analytics
 *   STAGING_BASE=https://tu-staging.up.railway.app node scripts/staging-demo-preflight.mjs
 */
const BASE =
  process.env.STAGING_BASE?.trim() || "https://ideal-victory-staging.up.railway.app";
const QA_EMAIL = process.env.STAGING_QA_EMAIL?.trim() || "qa-audit-20260612@nelvyon.test";
const QA_PASSWORD = process.env.STAGING_QA_PASSWORD?.trim() || "StagingQA2026!";
const COOKIE = "nelvyon_token";
const TIMEOUT_MS = 90_000;
const SKIP_ANALYTICS = process.argv.includes("--skip-analytics");

const CRITICAL = [];

function fail(m, c, d) {
  CRITICAL.push({ module: m, check: c, detail: d });
  console.log(`FAIL [${m}] ${c}: ${d}`);
}
function pass(m, c, d = "ok") {
  console.log(`PASS [${m}] ${c}: ${d}`);
}
function warnOptional(m, c, d) {
  console.log(`WARN [${m}] ${c}: ${d}`);
}

function authHeaders(token, workspaceId) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
    "Content-Type": "application/json",
    Cookie: `${COOKIE}=${token}`,
    ...(workspaceId ? { "X-Workspace-Id": workspaceId } : {}),
  };
}

async function probeRoute(path, token, workspaceId) {
  const res = await fetch(`${BASE}${path}`, {
    headers: authHeaders(token, workspaceId),
    cache: "no-store",
  });
  if (res.status !== 200) {
    fail("routes", path, `HTTP ${res.status}`);
    return false;
  }
  pass("routes", path, `HTTP 200`);
  return true;
}

async function login() {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ email: QA_EMAIL, password: QA_PASSWORD }),
  });
  if (!res.ok) {
    fail("auth", "login", `HTTP ${res.status}`);
    return null;
  }
  const data = await res.json();
  if (!data.token) {
    fail("auth", "login", "no token");
    return null;
  }
  pass("auth", "login", `user=${data.userId ?? "?"}`);
  return data.token;
}

async function workspaceId(token) {
  const res = await fetch(`${BASE}/api/platform/workspaces/list`, {
    headers: authHeaders(token),
    cache: "no-store",
  });
  if (!res.ok) {
    fail("auth", "workspaces", `HTTP ${res.status}`);
    return "";
  }
  const data = await res.json();
  const items = data.items ?? data.workspaces ?? [];
  const id = items[0]?.id ?? items[0]?.workspace_id;
  if (!id) {
    fail("auth", "workspaces", "empty list");
    return "";
  }
  pass("auth", "workspace", `id=${id}`);
  return String(id);
}

const DEMO_KICKOFF_BODY = {
  elite_preset_id: "local-restaurant-elite",
  business_name: `Preflight Demo ${Date.now()}`,
  sector: "restaurant",
  city: "Madrid",
  country: "ES",
  value_proposition: "Pizza artesanal y ambiente familiar en el centro",
  primary_cta: "Reservar mesa",
  contact_email: QA_EMAIL,
};

async function kickoffLocal(token, wsId) {
  const res = await fetch(`${BASE}/api/os/packs/local-business-growth/kickoff`, {
    method: "POST",
    headers: authHeaders(token, wsId),
    body: JSON.stringify(DEMO_KICKOFF_BODY),
  });
  if (res.status !== 201 && res.status !== 200) {
    const t = await res.text();
    fail("pack", "kickoff-local", `HTTP ${res.status}: ${t.slice(0, 160)}`);
    return;
  }
  const run = await res.json();
  if (!run.id) {
    fail("pack", "kickoff-local", "no run id");
    return;
  }
  pass("pack", "kickoff-local", `run=${run.id} status=${run.status ?? "?"}`);
  if (run.report?.sections?.length > 0) {
    pass("pack", "report-sections", `${run.report.sections.length} secciones`);
  } else if (run.status === "completed" && run.report) {
    warnOptional("pack", "report-sections", "sin secciones (deploy anterior?)");
  }
}

async function kickoffAnalytics(token, wsId) {
  const res = await fetch(`${BASE}/api/os/packs/analytics-insights/kickoff`, {
    method: "POST",
    headers: authHeaders(token, wsId),
    body: JSON.stringify({
      business_name: `Preflight Analytics ${Date.now()}`,
      period_days: 28,
      demo_mode: true,
    }),
  });
  if (res.status === 404) {
    warnOptional("analytics", "kickoff", "ruta no desplegada aún");
    return;
  }
  if (res.status !== 201 && res.status !== 200) {
    const t = await res.text();
    fail("analytics", "kickoff", `HTTP ${res.status}: ${t.slice(0, 160)}`);
    return;
  }
  const run = await res.json();
  if (!run.id) {
    fail("analytics", "kickoff", "no run id");
    return;
  }
  pass("analytics", "kickoff", `run=${run.id} provenance=${run.report?.data_provenance ?? "?"}`);
  if (run.report?.live_insight?.headline) {
    pass("analytics", "live-insight", run.report.live_insight.headline.slice(0, 80));
  }
}

async function probeGa4Status(token, wsId) {
  const res = await fetch(`${BASE}/api/integrations/ga4/status`, {
    headers: authHeaders(token, wsId),
    cache: "no-store",
  });
  if (res.status === 404) {
    warnOptional("analytics", "ga4-status", "no desplegado");
    return;
  }
  if (res.status !== 200) {
    fail("analytics", "ga4-status", `HTTP ${res.status}`);
    return;
  }
  const data = await res.json();
  pass(
    "analytics",
    "ga4-status",
    `connected=${data.connected} demo_fallback=${data.demo_fallback_available}`,
  );
}

async function osCatalogSummary(token) {
  const res = await fetch(`${BASE}/api/os/core/catalog?view=summary`, {
    headers: authHeaders(token),
    cache: "no-store",
  });
  if (res.status !== 200) {
    fail("os", "catalog-summary", `HTTP ${res.status}`);
    return;
  }
  const data = await res.json();
  if (data.status !== "ok" || data.layer !== "nelvyon-os-internal") {
    fail("os", "catalog-summary", `unexpected: ${JSON.stringify(data).slice(0, 120)}`);
    return;
  }
  pass(
    "os",
    "catalog-summary",
    `agents=${data.agentsRegistered} templates=${data.processTemplates}`,
  );
}

async function main() {
  const t0 = Date.now();
  console.log(`\n=== Demo preflight · ${BASE} ===\n`);

  const token = await login();
  if (!token) process.exit(1);
  const wsId = await workspaceId(token);
  if (!wsId) process.exit(1);

  await probeRoute("/packs", token, wsId);
  await kickoffLocal(token, wsId);
  if (!SKIP_ANALYTICS) {
    await probeGa4Status(token, wsId);
    await probeRoute("/dashboard/analytics-insights", token, wsId);
    await kickoffAnalytics(token, wsId);
  }
  await osCatalogSummary(token);

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`\n--- ${elapsed}s elapsed ---`);
  if (CRITICAL.length > 0) {
    console.log(`\nPREFLIGHT FAIL (${CRITICAL.length} critical)`);
    process.exit(1);
  }
  console.log("\nPREFLIGHT OK — staging listo para demo");
  if (Number(elapsed) > TIMEOUT_MS / 1000) {
    console.log(`WARN: superó objetivo ${TIMEOUT_MS / 1000}s`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
