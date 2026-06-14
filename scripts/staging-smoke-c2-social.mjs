/**
 * Staging smoke test — FASE C élite (C2 Social).
 * Usage: node scripts/staging-smoke-c2-social.mjs [--skip-wait]
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
  console.log("Waiting for staging deploy (C2 /social + BFF)…");
  for (let i = 1; i <= 40; i += 1) {
    try {
      const health = await fetch(`${BASE}/api/health/live`, { cache: "no-store" });
      const bff = await fetch(`${BASE}/api/platform/social/reporting/unified`, { cache: "no-store" });
      const page = await fetch(`${BASE}/social`, { cache: "no-store", redirect: "manual" });
      const bffOk = bff.status !== 404 && bff.status !== 0;
      const pageExists = page.status !== 404;
      console.log(JSON.stringify({ attempt: i, health: health.status, socialBff: bff.status, socialPage: page.status }));
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
  console.log("\n=== C2 Social — pages ===");
  await probePage("C2", "/social hub", "/social", token, workspaceId, { contains: ["__next"] });
  await probePage("C2", "/social/scheduler", "/social/scheduler", token, workspaceId, {
    contains: ["Programación"],
  });
  await probePage("C2", "/social/monitoring", "/social/monitoring", token, workspaceId, {
    contains: ["Monitoring"],
  });
  await probePage("C2", "/social/auto-publish", "/social/auto-publish", token, workspaceId, {
    contains: ["Auto-publicación"],
  });
  await probePage("C2", "/analytics/social", "/analytics/social", token, workspaceId, {
    contains: ["Social", "engagement"],
  });
  await probePage("C2", "redirect /dashboard/social-scheduler", "/dashboard/social-scheduler", token, workspaceId, {
    redirectTo: "/social/scheduler",
  });
  await probePage("C2", "redirect /saas/dashboard/social", "/saas/dashboard/social", token, workspaceId, {
    redirectTo: "/social/auto-publish",
  });

  console.log("\n=== C2 Social — BFF ===");
  const unified = await probeApi(
    "C2",
    "API unified reporting",
    "/api/platform/social/reporting/unified",
    token,
    workspaceId,
    [200],
  );
  await probeApi("C2", "API monitoring", "/api/platform/social/monitoring/dashboard", token, workspaceId, [200]);
  await probeApi("C2", "API scheduler", "/api/platform/social/scheduler/overview", token, workspaceId, [200]);

  if (unified && typeof unified.unified !== "object") {
    fail("C2", "unified shape", "missing unified block");
  } else if (unified) {
    pass("C2", "unified shape", `accounts=${unified.unified?.connected_accounts ?? 0}`);
  }
}

async function main() {
  console.log(`Staging smoke C2 Social → ${BASE}\n`);
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
