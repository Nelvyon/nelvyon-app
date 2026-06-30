/**
 * Staging smoke test — FASE B élite (B1 CRM, B2 Helpdesk, B3 Portal shell, B4 Reporting).
 * Usage: node scripts/staging-smoke-b1-b4.mjs [--skip-wait]
 */
import { getWorkspaceIdWithFallback } from "./lib/smoke-workspace.mjs";
const BASE = process.env.STAGING_BASE_URL?.trim() || "https://nelvyon.com";
const QA_EMAIL = "qa-audit-20260612@nelvyon.test";
const QA_PASSWORD = "StagingQA2026!";
const COOKIE = "nelvyon_token";
const SKIP_WAIT = process.argv.includes("--skip-wait");

const CRITICAL = [];

function fail(module, check, detail) {
  CRITICAL.push({ module, check, detail });
  console.log(`FAIL [${module}] ${check}: ${detail}`);
}

function pass(module, check, detail = "ok") {
  console.log(`PASS [${module}] ${check}: ${detail}`);
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForDeploy() {
  if (SKIP_WAIT) {
    console.log("SKIP deploy wait");
    return;
  }
  console.log("Waiting for staging deploy (BFF routes + /crm shell)…");
  for (let i = 1; i <= 40; i += 1) {
    try {
      const health = await fetch(`${BASE}/api/health/live`, { cache: "no-store" });
      const stats = await fetch(`${BASE}/api/platform/inbox/stats`, { cache: "no-store" });
      const crmPage = await fetch(`${BASE}/crm`, { cache: "no-store", redirect: "manual" });
      const statsOk = stats.status !== 404 && stats.status !== 0;
      const crmExists = crmPage.status !== 404;
      console.log(
        JSON.stringify({
          attempt: i,
          health: health.status,
          inboxStats: stats.status,
          crmPage: crmPage.status,
        }),
      );
      if (health.status === 200 && statsOk && crmExists) {
        console.log("DEPLOY_READY");
        return;
      }
    } catch (e) {
      console.log(JSON.stringify({ attempt: i, error: String(e) }));
    }
    await sleep(30000);
  }
  fail("deploy", "wait", "Deploy timeout after 20 min — continuing smoke test anyway");
}

async function login() {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: QA_EMAIL, password: QA_PASSWORD }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Login ${res.status}: ${t.slice(0, 200)}`);
  }
  const data = await res.json();
  const token = data.token;
  if (!token) throw new Error("No token in login response");
  pass("auth", "login", `userId=${data.userId}`);
  return token;
}

async function getWorkspaceId(token) {
  return getWorkspaceIdWithFallback(BASE, token, pass);
}

function authHeaders(token, workspaceId) {
  const h = {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
    Cookie: `${COOKIE}=${token}`,
  };
  if (workspaceId) h["X-Workspace-Id"] = workspaceId;
  return h;
}

async function probeApi(module, name, path, token, workspaceId, expectStatuses = [200]) {
  const res = await fetch(`${BASE}${path}`, {
    headers: authHeaders(token, workspaceId),
    cache: "no-store",
  });
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text.slice(0, 200);
  }
  if (!expectStatuses.includes(res.status)) {
    fail(module, name, `HTTP ${res.status} — ${typeof body === "string" ? body : JSON.stringify(body).slice(0, 150)}`);
    return null;
  }
  pass(module, name, `HTTP ${res.status}`);
  return body;
}

async function probePage(module, name, path, token, workspaceId, checks = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: authHeaders(token, workspaceId),
    redirect: checks.follow ? "follow" : "manual",
    cache: "no-store",
  });
  const location = res.headers.get("location");

  if (checks.redirectTo && (res.status === 301 || res.status === 302 || res.status === 307 || res.status === 308)) {
    if (location?.includes(checks.redirectTo)) {
      pass(module, name, `redirect → ${location}`);
      return;
    }
    fail(module, name, `expected redirect to ${checks.redirectTo}, got ${res.status} → ${location}`);
    return;
  }

  if (res.status !== 200) {
    fail(module, name, `HTTP ${res.status}${location ? ` → ${location}` : ""}`);
    return;
  }

  const html = await res.text();
  if (/Application error|Internal Server Error|Unhandled Runtime Error/i.test(html)) {
    fail(module, name, "runtime error in HTML");
    return;
  }
  if (html.length < 600 && !html.includes("__next")) {
    fail(module, name, `suspiciously short HTML (${html.length} bytes)`);
    return;
  }
  for (const needle of checks.contains ?? []) {
    const found = html.toLowerCase().includes(needle.toLowerCase());
    if (!found) {
      fail(module, name, `missing expected content: "${needle}"`);
      return;
    }
  }
  pass(module, name, `HTTP 200 (${html.length} bytes)`);
}

async function runSmoke(token, workspaceId) {
  console.log("\n=== B1 CRM ===");
  await probePage("B1", "/crm page", "/crm", token, workspaceId, {
    follow: true,
    contains: ["__next"],
  });
  await probePage("B1", "/crm/clients", "/crm/clients", token, workspaceId);
  await probePage("B1", "/crm/deals", "/crm/deals", token, workspaceId);
  await probePage("B1", "/analytics/revenue", "/analytics/revenue", token, workspaceId);

  const clients = await probeApi("B1", "API clients", "/api/platform/crm/clients", token, workspaceId, [200]);
  const deals = await probeApi("B1", "API deals", "/api/platform/crm/deals", token, workspaceId, [200]);
  const pipeline = await probeApi("B1", "API pipeline", "/api/platform/crm/pipeline", token, workspaceId, [200]);

  if (clients && !Array.isArray(clients.items) && clients.items !== undefined) {
    fail("B1", "clients shape", "expected items array");
  } else if (clients) {
    pass("B1", "clients shape", `items=${clients.items?.length ?? 0}`);
  }
  if (pipeline && typeof pipeline !== "object") {
    fail("B1", "pipeline shape", "not an object");
  }

  console.log("\n=== B2 Helpdesk ===");
  await probePage("B2", "/inbox/tickets", "/inbox/tickets", token, workspaceId);
  await probePage("B2", "/analytics/tickets", "/analytics/tickets", token, workspaceId, {
    contains: ["analytics", "ticket"],
  });
  await probePage("B2", "redirect /dashboard/helpdesk", "/dashboard/helpdesk", token, workspaceId, {
    redirectTo: "/inbox/tickets",
  });

  const tickets = await probeApi("B2", "API tickets", "/api/platform/inbox/tickets", token, workspaceId, [200]);
  const stats = await probeApi("B2", "API inbox stats", "/api/platform/inbox/stats", token, workspaceId, [200]);

  if (stats) {
    const required = ["total_count", "sla_compliance_rate", "open_count"];
    for (const k of required) {
      if (!(k in stats)) fail("B2", `stats.${k}`, "missing field");
      else pass("B2", `stats.${k}`, String(stats[k]));
    }
  }
  if (tickets && !Array.isArray(tickets.items)) {
    fail("B2", "tickets shape", "expected items array");
  }

  console.log("\n=== B3 Portal (shell + auth pages) ===");
  await probePage("B3", "/portal sign-in redirect", "/portal", token, workspaceId);
  await probePage("B3", "/client/sign-in", "/client/sign-in", token, workspaceId, {
    contains: ["sesión", "password"],
  });
  await probePage("B3", "/client/accept-invite", "/client/accept-invite", token, workspaceId, {
    contains: ["contraseña", "cuenta"],
  });
  // Portal API requires portal JWT — probe returns 401 without it (expected)
  const portalMe = await fetch(`${BASE}/api/v1/portal/me`, { cache: "no-store" });
  if (portalMe.status === 401 || portalMe.status === 403) {
    pass("B3", "portal API auth gate", `HTTP ${portalMe.status}`);
  } else if (portalMe.status >= 500) {
    fail("B3", "portal API", `HTTP ${portalMe.status}`);
  } else {
    pass("B3", "portal API", `HTTP ${portalMe.status}`);
  }

  console.log("\n=== B4 Reporting ===");
  await probePage("B4", "/analytics hub", "/analytics", token, workspaceId, {
    follow: true,
    contains: ["analytics", "reportes"],
  });
  await probePage("B4", "/analytics/reportes", "/analytics/reportes", token, workspaceId, {
    contains: ["Analytics centro", "Instantáneas"],
  });
  await probePage("B4", "redirect /dashboard/reportes", "/dashboard/reportes", token, workspaceId, {
    redirectTo: "/analytics/reportes",
  });

  const reportsCrm = await probeApi(
    "B4",
    "reports CRM API",
    `/api/reports/crm?start_date=2026-05-01&end_date=2026-06-13`,
    token,
    workspaceId,
    [200, 404],
  );
  if (reportsCrm) pass("B4", "reports CRM body", "received");

  console.log("\n=== Legacy redirects ===");
  await probePage("B1", "/dashboard/crm redirect", "/dashboard/crm", token, workspaceId, {
    redirectTo: "/crm/clients",
  });
  await probePage("B1", "/saas/crm page", "/saas/crm", token, workspaceId, {
    follow: true,
    contains: ["__next", "CRM"],
  });
}

async function main() {
  console.log(`Staging smoke B1-B4 → ${BASE}\n`);
  await waitForDeploy();
  const token = await login();
  const workspaceId = await getWorkspaceId(token);
  if (!workspaceId) {
    console.log("\nSMOKE_ABORT: no workspace");
    process.exit(1);
  }
  await runSmoke(token, workspaceId);

  console.log("\n=== SUMMARY ===");
  if (CRITICAL.length === 0) {
    console.log("ALL_CRITICAL_PASS");
    process.exit(0);
  }
  console.log(JSON.stringify(CRITICAL, null, 2));
  console.log(`CRITICAL_FAILURES: ${CRITICAL.length}`);
  process.exit(1);
}

main().catch((e) => {
  console.error("SMOKE_FATAL", e);
  process.exit(1);
});
