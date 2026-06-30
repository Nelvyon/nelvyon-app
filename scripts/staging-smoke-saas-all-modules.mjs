/**
 * Smoke all 59 SaaS sidebar modules — page load + API reachability.
 * Usage: node scripts/staging-smoke-saas-all-modules.mjs [--skip-wait]
 */
import { getWorkspaceIdWithFallback } from "./lib/smoke-workspace.mjs";
import { loadSaasNavModules } from "./lib/saas-nav-modules.mjs";

const BASE = process.env.STAGING_BASE_URL?.trim() || "https://nelvyon.com";
const QA_EMAIL = "qa-audit-20260612@nelvyon.test";
const QA_PASSWORD = "StagingQA2026!";
const COOKIE = "nelvyon_token";
const SKIP_WAIT = process.argv.includes("--skip-wait");

const CRITICAL = [];
const WARN = [];

function fail(id, check, detail) {
  CRITICAL.push({ id, check, detail });
  console.log(`FAIL [${id}] ${check}: ${detail}`);
}

function warn(id, check, detail) {
  WARN.push({ id, check, detail });
  console.log(`WARN [${id}] ${check}: ${detail}`);
}

function pass(id, check, detail = "ok") {
  console.log(`PASS [${id}] ${check}: ${detail}`);
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForDeploy() {
  if (SKIP_WAIT) {
    console.log("SKIP deploy wait");
    return;
  }
  for (let i = 1; i <= 6; i += 1) {
    try {
      const h = await fetch(`${BASE}/api/health/live`, { cache: "no-store" });
      if (h.status === 200) {
        console.log("DEPLOY_READY");
        return;
      }
    } catch {
      /* retry */
    }
    await sleep(10000);
  }
  warn("deploy", "wait", "health timeout — continuing");
}

async function login() {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: QA_EMAIL, password: QA_PASSWORD }),
  });
  if (!res.ok) throw new Error(`Login ${res.status}`);
  const data = await res.json();
  if (!data.token) throw new Error("No token");
  pass("auth", "login", `userId=${data.userId}`);
  return data.token;
}

function headers(token, workspaceId) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
    Cookie: `${COOKIE}=${token}`,
    "X-Workspace-Id": workspaceId,
  };
}

async function probeModule(mod, token, workspaceId) {
  const pageRes = await fetch(`${BASE}${mod.href}`, {
    headers: headers(token, workspaceId),
    redirect: "manual",
    cache: "no-store",
  });

  if (pageRes.status === 301 || pageRes.status === 302 || pageRes.status === 307 || pageRes.status === 308) {
    const loc = pageRes.headers.get("location") ?? "";
    if (loc.includes("/login")) {
      fail(mod.id, "page", `redirect to login (${pageRes.status})`);
      return;
    }
    pass(mod.id, "page", `redirect ${pageRes.status} → ${loc}`);
    return;
  }

  if (pageRes.status !== 200) {
    fail(mod.id, "page", `HTTP ${pageRes.status}`);
    return;
  }

  const html = await pageRes.text();
  if (/Application error|Internal Server Error|Unhandled Runtime Error/i.test(html)) {
    fail(mod.id, "page", "runtime error in HTML");
    return;
  }
  if (html.length < 400 && !html.includes("__next")) {
    fail(mod.id, "page", `suspiciously short HTML (${html.length}b)`);
    return;
  }
  pass(mod.id, "page", `HTTP 200 (${html.length}b)`);

  const apiRes = await fetch(`${BASE}${mod.apiPath}`, {
    headers: headers(token, workspaceId),
    cache: "no-store",
  });

  if (apiRes.status === 200) {
    pass(mod.id, "api", mod.apiPath);
    return;
  }
  if (apiRes.status === 401 || apiRes.status === 403) {
    warn(mod.id, "api", `${mod.apiPath} HTTP ${apiRes.status} (page OK — likely needs SaaS tenant cookie)`);
    return;
  }
  if (apiRes.status === 404) {
    warn(mod.id, "api", `${mod.apiPath} HTTP 404`);
    return;
  }
  if (apiRes.status >= 500) {
    fail(mod.id, "api", `${mod.apiPath} HTTP ${apiRes.status}`);
    return;
  }
  pass(mod.id, "api", `${mod.apiPath} HTTP ${apiRes.status}`);
}

async function main() {
  const modules = loadSaasNavModules();
  console.log(`SaaS all-modules smoke → ${BASE} (${modules.length} nav items)\n`);

  if (modules.length < 59) {
    fail("parse", "saasNav", `expected 59 items, got ${modules.length}`);
  } else {
    pass("parse", "saasNav", `count=${modules.length}`);
  }

  await waitForDeploy();
  const token = await login();
  const workspaceId = await getWorkspaceIdWithFallback(BASE, token, pass);

  for (const mod of modules) {
    await probeModule(mod, token, workspaceId);
  }

  console.log("\n=== SUMMARY ===");
  console.log(`modules=${modules.length} critical=${CRITICAL.length} warnings=${WARN.length}`);
  if (CRITICAL.length === 0) {
    console.log("ALL_CRITICAL_PASS");
    process.exit(0);
  }
  console.log(JSON.stringify(CRITICAL, null, 2));
  process.exit(1);
}

main().catch((e) => {
  console.error("SMOKE_FATAL", e);
  process.exit(1);
});
