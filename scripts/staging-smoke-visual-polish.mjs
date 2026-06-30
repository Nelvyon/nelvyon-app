/**
 * Staging visual polish smoke — dashboards must show demo KPIs (not empty zeros).
 * Usage: node scripts/staging-smoke-visual-polish.mjs [--skip-wait]
 */
import { getWorkspaceIdWithFallback } from "./lib/smoke-workspace.mjs";
const BASE = process.env.STAGING_BASE_URL?.trim() || "https://nelvyon.com";
const QA_EMAIL = "qa-audit-20260612@nelvyon.test";
const QA_PASSWORD = "StagingQA2026!";
const COOKIE = "nelvyon_token";
const SKIP_WAIT = process.argv.includes("--skip-wait");

const CRITICAL = [];

function fail(m, c, d) {
  CRITICAL.push({ module: m, check: c, detail: d });
  console.log(`FAIL [${m}] ${c}: ${d}`);
}
function pass(m, c, d = "ok") {
  console.log(`PASS [${m}] ${c}: ${d}`);
}
async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForDeploy() {
  if (SKIP_WAIT) return;
  for (let i = 1; i <= 40; i += 1) {
    try {
      const h = await fetch(`${BASE}/api/health/live`, { cache: "no-store" });
      const dash = await fetch(`${BASE}/dashboard`, { cache: "no-store" });
      const html = dash.status === 200 ? await dash.text() : "";
      const uiReady = html.toLowerCase().includes("pulso del workspace");
      console.log(JSON.stringify({ attempt: i, health: h.status, dashboard: dash.status, uiReady }));
      if (h.status === 200 && uiReady) {
        console.log("DEPLOY_READY");
        return;
      }
    } catch {}
    await sleep(30000);
  }
  fail("deploy", "wait", "timeout — continuing");
}

async function login() {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: QA_EMAIL, password: QA_PASSWORD }),
  });
  const data = await res.json();
  if (!data.token) throw new Error("No token");
  pass("auth", "login");
  return data.token;
}

async function workspace(token) {
  return getWorkspaceIdWithFallback(BASE, token, pass);
}

function headers(token, ws) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
    Cookie: `${COOKIE}=${token}`,
    "X-Workspace-Id": ws,
  };
}

async function page(name, path, token, ws, needles) {
  const res = await fetch(`${BASE}${path}`, { headers: headers(token, ws), cache: "no-store" });
  if (res.status !== 200) {
    fail("visual", name, `HTTP ${res.status}`);
    return;
  }
  const html = await res.text();
  for (const n of needles) {
    if (!html.toLowerCase().includes(n.toLowerCase())) {
      fail("visual", name, `missing "${n}"`);
      return;
    }
  }
  pass("visual", name, `${needles.length} checks`);
}

async function apiDemo(name, path, token, ws, field) {
  const res = await fetch(`${BASE}${path}`, { headers: headers(token, ws), cache: "no-store" });
  if (res.status !== 200) {
    fail("bff", name, `HTTP ${res.status}`);
    return;
  }
  const body = await res.json();
  const val = field.split(".").reduce((o, k) => o?.[k], body);
  if (typeof val === "number" && val > 0) {
    pass("bff", name, `${field}=${val}`);
    return;
  }
  if (field.includes("mock") && val === true) {
    pass("bff", name, "mock=true");
    return;
  }
  if (Array.isArray(val) && val.length > 0) {
    pass("bff", name, `${field}.length=${val.length}`);
    return;
  }
  fail("bff", name, `empty demo for ${field}`);
}

async function main() {
  console.log(`Visual polish smoke → ${BASE}\n`);
  await waitForDeploy();
  const token = await login();
  const ws = await workspace(token);
  if (!ws) {
    process.exit(1);
  }

  await page("home pulse", "/dashboard", token, ws, ["Pulso del workspace", "Inversión ads"]);
  await page("crm demo", "/crm/clients", token, ws, ["Datos demo", "Deals recientes"]);
  await page("publicidad", "/publicidad", token, ws, ["Inversión total", "Google Ads"]);
  await page("social", "/social", token, ws, ["Alcance total", "Sentimiento"]);
  await page("funnels", "/funnels", token, ws, ["Conversión por paso", "Embudos"]);
  await page("ecommerce", "/ecommerce", token, ws, ["Carrito y checkout", "Ingresos"]);
  await page("analytics hub", "/analytics", token, ws, ["Instantáneas", "Publicidad"]);

  await apiDemo("ads unified", "/api/platform/ads/reporting/unified", token, ws, "unified.total_spend");
  await apiDemo("social unified", "/api/platform/social/reporting/unified", token, ws, "unified.total_reach");
  await apiDemo("funnels unified", "/api/platform/funnels/reporting/unified", token, ws, "unified.total_visits");
  await apiDemo("ecommerce unified", "/api/platform/ecommerce/reporting/unified", token, ws, "unified.total_revenue_cents");

  console.log("\n=== SUMMARY ===");
  if (CRITICAL.length === 0) {
    console.log("ALL_CRITICAL_PASS");
    process.exit(0);
  }
  console.log(JSON.stringify(CRITICAL, null, 2));
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
