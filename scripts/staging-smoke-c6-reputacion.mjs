/**
 * Staging smoke test — FASE C élite (C6 Reputación).
 * Usage: node scripts/staging-smoke-c6-reputacion.mjs [--skip-wait]
 */
const BASE = "https://ideal-victory-staging.up.railway.app";
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
  console.log("Waiting for staging deploy (C6 /reputacion + BFF)…");
  for (let i = 1; i <= 40; i += 1) {
    try {
      const health = await fetch(`${BASE}/api/health/live`, { cache: "no-store" });
      const bff = await fetch(`${BASE}/api/platform/reputacion/reporting/unified`, { cache: "no-store" });
      const page = await fetch(`${BASE}/reputacion`, { cache: "no-store", redirect: "manual" });
      const bffOk = bff.status !== 404 && bff.status !== 0;
      const pageExists = page.status !== 404;
      console.log(
        JSON.stringify({
          attempt: i,
          health: health.status,
          reputacionBff: bff.status,
          reputacionPage: page.status,
        }),
      );
      if (health.status === 200 && bffOk && pageExists) {
        console.log("DEPLOY_READY");
        return;
      }
    } catch (e) {
      console.log(JSON.stringify({ attempt: i, error: String(e) }));
    }
    await sleep(30000);
  }
  fail("deploy", "wait", "Deploy timeout — continuing smoke test anyway");
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
  const res = await fetch(`${BASE}/api/platform/workspaces/list`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    fail("auth", "workspaces", `status ${res.status}`);
    return null;
  }
  const data = await res.json();
  const items = data.items ?? data.workspaces ?? (Array.isArray(data) ? data : []);
  const id = items[0]?.id ?? items[0]?.workspace_id;
  if (!id) {
    fail("auth", "workspaces", "no workspace in list");
    return null;
  }
  pass("auth", "workspace", `id=${id}`);
  return String(id);
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
    fail(
      module,
      name,
      `HTTP ${res.status} — ${typeof body === "string" ? body : JSON.stringify(body).slice(0, 150)}`,
    );
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

  if (checks.redirectTo) {
    fail(module, name, `expected redirect to ${checks.redirectTo}, got HTTP ${res.status}`);
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
    if (!html.toLowerCase().includes(needle.toLowerCase())) {
      fail(module, name, `missing expected content: "${needle}"`);
      return;
    }
  }
  pass(module, name, `HTTP 200 (${html.length} bytes)`);
}

async function runSmoke(token, workspaceId) {
  console.log("\n=== C6 Reputación — pages ===");
  await probePage("C6", "/reputacion hub", "/reputacion", token, workspaceId, {
    contains: ["Reputación", "reseñas"],
  });
  await probePage("C6", "/reputacion/resenas", "/reputacion/resenas", token, workspaceId, {
    contains: ["Reseñas", "sentimiento"],
  });
  await probePage("C6", "/reputacion/alertas", "/reputacion/alertas", token, workspaceId, {
    contains: ["Alertas", "negativas"],
  });
  await probePage("C6", "/reputacion/widgets", "/reputacion/widgets", token, workspaceId, {
    contains: ["Widget", "embed"],
  });
  await probePage("C6", "/analytics/reputacion", "/analytics/reputacion", token, workspaceId, {
    contains: ["Reputación", "sentimiento"],
  });

  console.log("\n=== C6 Reputación — BFF ===");
  const unified = await probeApi(
    "C6",
    "API unified reporting",
    "/api/platform/reputacion/reporting/unified",
    token,
    workspaceId,
    [200],
  );
  await probeApi("C6", "API reviews", "/api/platform/reputacion/reviews", token, workspaceId, [200]);
  await probeApi("C6", "API alerts", "/api/platform/reputacion/alerts", token, workspaceId, [200]);
  await probeApi("C6", "API embed", "/api/platform/reputacion/embed", token, workspaceId, [200]);

  if (unified && typeof unified.unified !== "object") {
    fail("C6", "unified shape", "missing unified block");
  } else if (unified) {
    pass("C6", "unified shape", `reviews=${unified.unified?.total_reviews ?? 0}`);
  }
}

async function main() {
  console.log(`Staging smoke C6 Reputación → ${BASE}\n`);
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
