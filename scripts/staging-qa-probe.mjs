/**
 * Staging route probe — logs HTTP status + console errors per authenticated route.
 * Usage: node scripts/staging-qa-probe.mjs
 */
const base = "https://ideal-victory-staging.up.railway.app";

const ROUTES = [
  "/dashboard",
  "/crm/clients",
  "/crm/clients/new",
  "/crm/deals",
  "/campaigns",
  "/campaigns/new",
  "/dashboard/sms",
  "/dashboard/inbox",
  "/inbox/tickets",
  "/inbox/tickets/new",
  "/dashboard/workflows",
  "/automations/jobs",
  "/dashboard/calendario",
  "/dashboard/reservas",
  "/dashboard/seo",
  "/dashboard/ia",
  "/dashboard/ai-model",
  "/dashboard/facturacion",
  "/billing",
  "/dashboard/contratos",
  "/dashboard/reportes",
  "/dashboard/analytics/benchmarks",
  "/dashboard/settings",
  "/dashboard/funnels",
  "/dashboard/live-chat",
  "/dashboard/formularios",
  "/help",
];

async function login() {
  const res = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "qa-audit-20260612@nelvyon.test",
      password: "StagingQA2026!",
    }),
  });
  if (!res.ok) throw new Error(`Login failed: ${res.status}`);
  const { token } = await res.json();
  return token;
}

async function probeRoute(token, path) {
  const pageRes = await fetch(`${base}${path}`, {
    headers: { Cookie: `accessToken=${token}` },
    redirect: "manual",
    cache: "no-store",
  });
  const status = pageRes.status;
  let location = pageRes.headers.get("location") ?? null;
  let snippet = "";
  if (status === 200) {
    const html = await pageRes.text();
    snippet = html.slice(0, 500);
    const hasError =
      /Application error|500|Internal Server|Something went wrong|Unhandled Runtime Error/i.test(html);
    const isBlank = html.length < 800 && !html.includes("__next");
    return { path, status, location, hasError, isBlank, htmlLen: html.length };
  }
  return { path, status, location, hasError: status >= 500, isBlank: false, htmlLen: 0 };
}

async function probeApi(token, path) {
  const res = await fetch(`${base}${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    cache: "no-store",
  });
  const text = await res.text();
  return { path, status: res.status, body: text.slice(0, 120) };
}

const token = await login();
console.log("LOGIN_OK");

const apiRoutes = [
  "/api/platform/crm/clients",
  "/api/platform/campaigns",
  "/api/platform/inbox/tickets",
  "/api/platform/workspaces/list",
];

console.log("\n=== API ===");
for (const p of apiRoutes) {
  console.log(JSON.stringify(await probeApi(token, p)));
}

console.log("\n=== PAGES ===");
const issues = [];
for (const path of ROUTES) {
  const r = await probeRoute(token, path);
  console.log(JSON.stringify(r));
  if (r.status >= 400 || r.hasError || r.isBlank) {
    issues.push(r);
  }
}

console.log("\n=== ISSUES ===");
console.log(JSON.stringify(issues, null, 2));
