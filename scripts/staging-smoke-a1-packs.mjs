/**
 * Staging smoke — FASE A Growth Packs (fast: target ≤12 min total).
 * Usage: node scripts/staging-smoke-a1-packs.mjs [--skip-wait]
 *
 * Critical: auth, catalog, 1 kickoff, 1 report dashboard, pack-report BFF.
 * Non-critical (logged only): extra kickoff/report pages and HTML keyword checks.
 */
const BASE = "https://ideal-victory-staging.up.railway.app";
const QA_EMAIL = "qa-audit-20260612@nelvyon.test";
const QA_PASSWORD = "StagingQA2026!";
const COOKIE = "nelvyon_token";
const SKIP_WAIT = process.argv.includes("--skip-wait");

/** Deploy poll: 12 × 15s ≈ 3 min max (was 40 × 30s ≈ 20 min). */
const MAX_DEPLOY_ATTEMPTS = 12;
const DEPLOY_INTERVAL_MS = 15_000;
/** Hard cap for entire script. */
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

/** Route exists if not 404/0 — no HTML grep (avoids CSR/auth false negatives). */
async function routeExists(path) {
  const res = await fetch(`${BASE}${path}`, { cache: "no-store", redirect: "manual" });
  return res.status !== 404 && res.status !== 0;
}

async function waitForDeploy() {
  if (SKIP_WAIT) {
    console.log("SKIP deploy wait");
    return;
  }
  console.log(`Waiting for staging deploy (max ${(MAX_DEPLOY_ATTEMPTS * DEPLOY_INTERVAL_MS) / 1000}s)…`);
  for (let i = 1; i <= MAX_DEPLOY_ATTEMPTS; i += 1) {
    try {
      const health = await fetch(`${BASE}/api/health/live`, { cache: "no-store" });
      const [packsHub, packReport, localKickoff] = await Promise.all([
        routeExists("/os/packs"),
        routeExists("/api/platform/pack-report"),
        routeExists("/os/packs/local-growth"),
      ]);
      console.log(
        JSON.stringify({
          attempt: i,
          health: health.status,
          packsHub,
          packReportBff: packReport,
          localKickoff,
        }),
      );
      if (health.status === 200 && packsHub && packReport && localKickoff) {
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
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Login ${res.status}: ${t.slice(0, 120)}`);
  }
  const data = await res.json();
  if (!data.token) throw new Error("No token in login response");
  pass("auth", "login", `userId=${data.userId ?? "?"}`);
  return data.token;
}

async function getWorkspaceId(token) {
  const res = await fetch(`${BASE}/api/platform/workspaces/list`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    fail("auth", "workspaces", `status ${res.status}`);
    return "";
  }
  const data = await res.json();
  const items = data.items ?? data.workspaces ?? (Array.isArray(data) ? data : []);
  const id = items[0]?.id ?? items[0]?.workspace_id;
  if (!id) {
    fail("auth", "workspaces", "no workspace in list");
    return "";
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

/** Critical page probe: HTTP 200 + no runtime error + minimal HTML shell. */
async function probePageCritical(module, name, path, token, workspaceId) {
  const res = await fetch(`${BASE}${path}`, {
    headers: authHeaders(token, workspaceId),
    cache: "no-store",
  });
  if (res.status !== 200) {
    fail(module, name, `HTTP ${res.status}`);
    return false;
  }
  const html = await res.text();
  if (/Application error|Internal Server Error|Unhandled Runtime Error/i.test(html)) {
    fail(module, name, "runtime error in HTML");
    return false;
  }
  if (html.length < 400 && !html.includes("__next")) {
    fail(module, name, `suspiciously short HTML (${html.length} bytes)`);
    return false;
  }
  pass(module, name, `HTTP 200 (${html.length} bytes)`);
  return true;
}

/** Optional keyword check — never fails the run. */
async function probePageSoft(module, name, path, token, workspaceId, needles = []) {
  const res = await fetch(`${BASE}${path}`, {
    headers: authHeaders(token, workspaceId),
    cache: "no-store",
  });
  if (res.status !== 200) {
    warn(module, name, `HTTP ${res.status}`);
    return;
  }
  const html = await res.text();
  for (const needle of needles) {
    if (!html.toLowerCase().includes(needle.toLowerCase())) {
      warn(module, name, `optional missing "${needle}"`);
      return;
    }
  }
  pass(module, name, "soft content ok");
}

async function probeApi(module, name, path, token, workspaceId) {
  const res = await fetch(`${BASE}${path}`, {
    headers: authHeaders(token, workspaceId),
    cache: "no-store",
  });
  if (res.status !== 200) {
    fail(module, name, `HTTP ${res.status}`);
    return;
  }
  pass(module, name, "HTTP 200");
}

async function runSmoke(token, workspaceId) {
  console.log("\n=== A1 Packs — critical ===");
  await probePageCritical("A1", "catalog /os/packs", "/os/packs", token, workspaceId);
  await probePageCritical("A1", "kickoff local-growth", "/os/packs/local-growth", token, workspaceId);
  await probePageCritical("A1", "report local-growth", "/dashboard/local-growth", token, workspaceId);
  await probeApi("A1", "pack-report BFF", "/api/platform/pack-report", token, workspaceId);

  console.log("\n=== A1 Packs — optional (soft) ===");
  await probePageSoft("A1", "kickoff ecommerce-growth", "/os/packs/ecommerce-growth", token, workspaceId, [
    "Ecommerce",
  ]);
  await probePageSoft("A1", "kickoff saas-b2b-growth", "/os/packs/saas-b2b-growth", token, workspaceId, ["SaaS"]);
  await probePageSoft("A1", "report ecommerce-growth", "/dashboard/ecommerce-growth", token, workspaceId, [
    "Ecommerce",
  ]);
  await probePageSoft("A1", "report saas-b2b-growth", "/dashboard/saas-b2b-growth", token, workspaceId, ["SaaS"]);
}

async function main() {
  const deadline = Date.now() + SCRIPT_TIMEOUT_MS;
  const guard = setInterval(() => {
    if (Date.now() > deadline) {
      console.error("SMOKE_TIMEOUT: exceeded 12 minute limit");
      process.exit(1);
    }
  }, 5000);

  try {
    console.log(`A1 Packs smoke → ${BASE}\n`);
    await waitForDeploy();
    const token = await login();
    const workspaceId = await getWorkspaceId(token);
    if (!workspaceId) {
      console.log("\nSMOKE_ABORT: no workspace");
      process.exit(1);
    }
    await runSmoke(token, workspaceId);

    console.log("\n=== SUMMARY ===");
    if (WARN.length) console.log(`Warnings (non-blocking): ${WARN.length}`);
    if (CRITICAL.length === 0) {
      console.log("ALL_CRITICAL_PASS");
      process.exit(0);
    }
    console.log(JSON.stringify(CRITICAL, null, 2));
    console.log(`CRITICAL_FAILURES: ${CRITICAL.length}`);
    process.exit(1);
  } finally {
    clearInterval(guard);
  }
}

main().catch((e) => {
  console.error("SMOKE_FATAL", e);
  process.exit(1);
});
