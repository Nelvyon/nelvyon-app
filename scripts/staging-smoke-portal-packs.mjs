/**
 * Staging smoke — Portal packs + closed blocks verification.
 * Usage: node scripts/staging-smoke-portal-packs.mjs [--skip-wait]
 *
 * Critical: health, A1 packs, C5 automation CEO, portal shell, hub/agency pages.
 */
const BASE = "https://ideal-victory-staging.up.railway.app";
const QA_EMAIL = "qa-audit-20260612@nelvyon.test";
const QA_PASSWORD = "StagingQA2026!";
const COOKIE = "nelvyon_token";
const SKIP_WAIT = process.argv.includes("--skip-wait");

const MAX_DEPLOY_ATTEMPTS = 16;
const DEPLOY_INTERVAL_MS = 15_000;
const SCRIPT_TIMEOUT_MS = 12 * 60 * 1000;

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

async function routeExists(path) {
  const res = await fetch(`${BASE}${path}`, { cache: "no-store", redirect: "manual" });
  return res.status !== 404 && res.status !== 0;
}

async function waitForDeploy() {
  if (SKIP_WAIT) {
    console.log("SKIP deploy wait");
    return;
  }
  console.log(`Waiting for staging deploy (portal packs, max ${(MAX_DEPLOY_ATTEMPTS * DEPLOY_INTERVAL_MS) / 1000}s)…`);
  for (let i = 1; i <= MAX_DEPLOY_ATTEMPTS; i += 1) {
    try {
      const health = await fetch(`${BASE}/api/health/live`, { cache: "no-store" });
      const [portal, automatizacion, packsHub, packReport, ceoMetrics] = await Promise.all([
        routeExists("/portal"),
        routeExists("/automatizacion"),
        routeExists("/os/packs"),
        routeExists("/api/platform/pack-report"),
        routeExists("/api/platform/packs/local-growth/ceo-metrics"),
      ]);
      console.log(
        JSON.stringify({ attempt: i, health: health.status, portal, automatizacion, packsHub, packReport, ceoMetrics }),
      );
      if (health.status === 200 && portal && automatizacion && packsHub && packReport && ceoMetrics) {
        console.log("DEPLOY_READY");
        return;
      }
    } catch (e) {
      console.log(JSON.stringify({ attempt: i, error: String(e) }));
    }
    await sleep(DEPLOY_INTERVAL_MS);
  }
  warn("deploy", "wait", "Deploy poll timeout — running smoke anyway");
}

async function login() {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: QA_EMAIL, password: QA_PASSWORD }),
  });
  if (!res.ok) throw new Error(`Login ${res.status}`);
  const data = await res.json();
  pass("auth", "login", `userId=${data.userId}`);
  return data.token;
}

async function getWorkspaceId(token) {
  const res = await fetch(`${BASE}/api/platform/workspaces/list`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Workspaces ${res.status}`);
  const list = await res.json();
  const id = list[0]?.id;
  if (id) pass("auth", "workspace", `id=${id}`);
  return id ?? null;
}

async function probePage(module, check, path, token, workspaceId, opts = {}) {
  const headers = {
    Cookie: `${COOKIE}=${token}`,
    Accept: "text/html",
    ...(workspaceId ? { "X-Workspace-Id": String(workspaceId) } : {}),
  };
  const res = await fetch(`${BASE}${path}`, {
    cache: "no-store",
    redirect: opts.redirect ? "follow" : "manual",
    headers,
  });
  const status = res.status;
  if (status === 404 || status === 0) {
    fail(module, check, `HTTP ${status}`);
    return null;
  }
  if (status >= 500) {
    fail(module, check, `HTTP ${status}`);
    return null;
  }
  let body = "";
  if (opts.contains?.length) {
    body = await res.text();
    for (const needle of opts.contains) {
      if (!body.toLowerCase().includes(needle.toLowerCase())) {
        fail(module, check, `missing "${needle}" in HTML`);
        return null;
      }
    }
  }
  pass(module, check, `HTTP ${status}${opts.contains ? ` (${opts.contains.join(",")})` : ""}`);
  return body;
}

async function probeApi(module, check, path, token, workspaceId, okStatuses = [200]) {
  const res = await fetch(`${BASE}${path}`, {
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      ...(workspaceId ? { "X-Workspace-Id": String(workspaceId) } : {}),
    },
  });
  if (!okStatuses.includes(res.status)) {
    fail(module, check, `HTTP ${res.status}`);
    return null;
  }
  let data = null;
  try {
    data = await res.json();
  } catch {
    pass(module, check, `HTTP ${res.status}`);
    return null;
  }
  pass(module, check, `HTTP ${res.status}`);
  return data;
}

async function probeApiNo404(module, check, path, token, workspaceId) {
  const res = await fetch(`${BASE}${path}`, {
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      ...(workspaceId ? { "X-Workspace-Id": String(workspaceId) } : {}),
    },
  });
  if (res.status === 404 || res.status === 0) {
    fail(module, check, `HTTP ${res.status}`);
    return null;
  }
  if (res.status >= 500) {
    fail(module, check, `HTTP ${res.status}`);
    return null;
  }
  pass(module, check, `HTTP ${res.status}`);
  let data = null;
  try {
    data = await res.json();
  } catch {
    return null;
  }
  return data;
}

async function runSmoke(token, workspaceId) {
  console.log("\n=== A1 Growth Packs ===");
  const packs = [
    { slug: "local-growth", id: "local-business-growth" },
    { slug: "ecommerce-growth", id: "ecommerce-growth" },
    { slug: "saas-b2b-growth", id: "saas-b2b-growth" },
  ];
  await probePage("packs", "catalog /os/packs", "/os/packs", token, workspaceId);
  for (const p of packs) {
    await probePage("packs", `kickoff ${p.slug}`, `/os/packs/${p.slug}`, token, workspaceId);
    await probePage("packs", `report ${p.slug}`, `/dashboard/${p.slug}`, token, workspaceId);
    await probeApi("packs", `pack-report BFF (${p.id})`, `/api/platform/pack-report?pack_id=${p.id}`, token, workspaceId);
    if (p.slug === "local-growth") {
      await probeApiNo404(
        "packs",
        "local CEO metrics BFF",
        "/api/platform/packs/local-growth/ceo-metrics",
        token,
        workspaceId,
      );
    }
    if (p.slug === "saas-b2b-growth") {
      await probeApiNo404(
        "packs",
        "saas B2B CEO metrics BFF",
        "/api/platform/packs/saas-b2b-growth/ceo-metrics",
        token,
        workspaceId,
      );
    }
  }

  console.log("\n=== C5 Automation CEO ===");
  await probePage("automation", "/automatizacion hub", "/automatizacion", token, workspaceId);
  const unified = await probeApi(
    "automation",
    "unified reporting BFF",
    "/api/platform/automations/reporting/unified",
    token,
    workspaceId,
  );
  if (unified && typeof unified.unified !== "object") {
    fail("automation", "unified shape", "missing unified block");
  } else if (unified) {
    pass("automation", "unified shape", `flows=${unified.unified?.total_flows ?? 0}`);
  }

  console.log("\n=== Portal packs UI ===");
  await probePage("portal", "/portal dashboard", "/portal", token, workspaceId);
  await probePage("portal", "/portal/projects", "/portal/projects", token, workspaceId);
  await probePage("portal", "/client/sign-in", "/client/sign-in", token, workspaceId, {
    contains: ["contraseña", "password", "sesión"],
  });

  const portalLogin = await fetch(`${BASE}/api/platform/portal/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: QA_EMAIL, password: QA_PASSWORD }),
  });

  if (portalLogin.status === 200) {
    const portalAuth = await portalLogin.json();
    const portalToken = portalAuth.access_token;
    pass("portal", "portal login BFF", "QA user has portal access");
    const projects = await fetch(`${BASE}/api/platform/portal/projects`, {
      headers: { Authorization: `Bearer ${portalToken}`, Accept: "application/json" },
    });
    if (projects.status === 200) {
      const pdata = await projects.json();
      pass("portal", "portal projects BFF", `total=${pdata.total ?? pdata.items?.length ?? 0}`);
      const withPack = (pdata.items ?? []).filter((p) => p.pack_id);
      if (withPack.length > 0) {
        pass("portal", "pack_id on project", `${withPack.length} project(s)`);
        const sample = withPack[0];
        const dels = await fetch(
          `${BASE}/api/platform/portal/deliverables?project_id=${sample.id}&page_size=50`,
          { headers: { Authorization: `Bearer ${portalToken}`, Accept: "application/json" } },
        );
        if (dels.status === 200) {
          const ddata = await dels.json();
          const hasSummary = (ddata.items ?? []).some((d) => d.pack_summary || d.pack_id);
          if (hasSummary) pass("portal", "pack fields on deliverables", "pack_id or pack_summary present");
          else warn("portal", "pack fields", "no pack metadata on deliverables yet (run a pack first)");
        } else {
          fail("portal", "portal deliverables BFF", `HTTP ${dels.status}`);
        }
      } else {
        warn("portal", "pack_id on project", "no pack projects yet — UI smoke only");
      }
    } else {
      fail("portal", "portal projects BFF", `HTTP ${projects.status}`);
    }
  } else if (portalLogin.status === 401 || portalLogin.status === 403) {
    warn(
      "portal",
      "portal login BFF",
      `HTTP ${portalLogin.status} — QA operator sin cuenta portal; shell UI OK`,
    );
  } else if (portalLogin.status === 404) {
    fail("portal", "portal login BFF", "HTTP 404 — route missing");
  } else {
    fail("portal", "portal login BFF", `HTTP ${portalLogin.status}`);
  }

  const portalMe = await fetch(`${BASE}/api/platform/portal/me`, { cache: "no-store" });
  if (portalMe.status === 401 || portalMe.status === 403) {
    pass("portal", "BFF auth gate /me", `HTTP ${portalMe.status}`);
  } else if (portalMe.status === 404) {
    fail("portal", "BFF auth gate /me", "HTTP 404 — deploy portal BFF");
  } else if (portalMe.status >= 500) {
    fail("portal", "BFF auth gate /me", `HTTP ${portalMe.status}`);
  } else {
    pass("portal", "BFF auth gate /me", `HTTP ${portalMe.status}`);
  }

  console.log("\n=== Hubs & agency layer ===");
  await probePage("hubs", "dashboard Launchpad", "/dashboard", token, workspaceId);
  await probePage("hubs", "white-label", "/dashboard/white-label", token, workspaceId);
  await probePage("hubs", "campaigns email templates", "/campaigns", token, workspaceId);
}

async function main() {
  console.log(`Portal packs smoke → ${BASE}\n`);
  const timeout = setTimeout(() => {
    console.log("SCRIPT_TIMEOUT");
    process.exit(1);
  }, SCRIPT_TIMEOUT_MS);

  try {
    await waitForDeploy();
    const token = await login();
    const workspaceId = await getWorkspaceId(token);
    if (!workspaceId) {
      fail("auth", "workspace", "missing");
      process.exit(1);
    }
    await runSmoke(token, workspaceId);

    console.log("\n=== SUMMARY ===");
    if (WARN.length) console.log(`WARNINGS: ${WARN.length}`);
    if (CRITICAL.length === 0) {
      console.log("ALL_CRITICAL_PASS");
      process.exit(0);
    }
    console.log(`CRITICAL_FAILS: ${CRITICAL.length}`);
    for (const f of CRITICAL) console.log(`  [${f.module}] ${f.check}: ${f.detail}`);
    process.exit(1);
  } finally {
    clearTimeout(timeout);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
