/**
 * Staging smoke — Partner HQ (P1 wholesale + P2a Stripe Connect).
 * Usage: node scripts/staging-smoke-p1-partners.mjs [--skip-wait]
 */
const BASE = process.env.STAGING_BASE_URL?.trim() || "https://nelvyon.com";
const QA_EMAIL = "qa-audit-20260612@nelvyon.test";
const QA_PASSWORD = "StagingQA2026!";
const COOKIE = "nelvyon_token";
const SKIP_WAIT = process.argv.includes("--skip-wait");

const VALID_CONNECT_STATUSES = ["not_started", "pending", "active", "restricted"];

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

async function waitForDeploy() {
  if (SKIP_WAIT) {
    console.log("SKIP deploy wait");
    return;
  }
  console.log("Waiting for staging deploy (Partner HQ + Connect BFF)…");
  for (let i = 1; i <= 24; i += 1) {
    try {
      const health = await fetch(`${BASE}/api/health/live`, { cache: "no-store" });
      const connect = await fetch(`${BASE}/api/platform/partners/connect/status`, { cache: "no-store" });
      const wholesale = await fetch(`${BASE}/api/platform/partners/wholesale`, { cache: "no-store" });
      console.log(
        JSON.stringify({
          attempt: i,
          health: health.status,
          connect: connect.status,
          wholesale: wholesale.status,
        }),
      );
      if (health.status === 200 && connect.status !== 404 && wholesale.status !== 404) {
        console.log("DEPLOY_READY");
        return;
      }
    } catch (e) {
      console.log(JSON.stringify({ attempt: i, error: String(e) }));
    }
    await sleep(15000);
  }
  warn("deploy", "wait", "timeout — running smoke anyway");
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
  if (res.status === 404 || res.status === 0) {
    fail(module, check, `HTTP ${res.status}`);
    return null;
  }
  if (res.status >= 500) {
    fail(module, check, `HTTP ${res.status}`);
    return null;
  }
  let body = "";
  if (opts.contains?.length) {
    body = (await res.text()).toLowerCase();
    for (const needle of opts.contains) {
      if (!body.includes(needle.toLowerCase())) {
        fail(module, check, `missing "${needle}"`);
        return null;
      }
    }
  }
  pass(module, check, `HTTP ${res.status}${opts.contains ? ` (${opts.contains.join(",")})` : ""}`);
  return body;
}

async function probeApi(module, check, path, token, workspaceId) {
  const res = await fetch(`${BASE}${path}`, {
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      ...(workspaceId ? { "X-Workspace-Id": String(workspaceId) } : {}),
    },
  });
  if (res.status === 404 || res.status >= 500) {
    fail(module, check, `HTTP ${res.status}`);
    return null;
  }
  if (res.status === 401 || res.status === 403) {
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

function assertConnectShape(module, connect, checkLabel) {
  if (!connect || typeof connect !== "object") {
    fail(module, checkLabel, "missing connect object");
    return false;
  }
  if (!VALID_CONNECT_STATUSES.includes(connect.onboarding_status)) {
    fail(module, checkLabel, `invalid status ${connect.onboarding_status}`);
    return false;
  }
  if (!connect.label || typeof connect.label !== "string") {
    fail(module, checkLabel, "missing connect.label");
    return false;
  }
  pass(module, checkLabel, `status=${connect.onboarding_status} label=${connect.label}`);
  return true;
}

async function main() {
  console.log(`Partner HQ smoke (P1+P2a) → ${BASE}\n`);
  await waitForDeploy();
  const token = await login();
  const workspaceId = await getWorkspaceId(token);
  if (!workspaceId) {
    fail("auth", "workspace", "missing");
    process.exit(1);
  }

  console.log("\n=== P2a Stripe Connect ===");
  const connectStatus = await probeApi(
    "connect",
    "/connect/status",
    "/api/platform/partners/connect/status",
    token,
    workspaceId,
  );
  if (connectStatus) {
    assertConnectShape("connect", connectStatus.connect, "connect status shape");
  }

  console.log("\n=== Partner HQ UI ===");
  await probePage("partners", "/dashboard/partners shell", "/dashboard/partners", token, workspaceId, {
    contains: ["partner hq", "cómo funciona tu comisión", "stripe connect", "tu margen este mes"],
  });

  console.log("\n=== Partner HQ BFF ===");
  const wholesale = await probeApi(
    "partners",
    "wholesale catalog",
    "/api/platform/partners/wholesale",
    token,
    workspaceId,
  );
  if (wholesale) {
    if (!wholesale.subscription?.wholesaleEur) {
      fail("partners", "wholesale shape", "missing subscription.wholesaleEur");
    } else {
      pass("partners", "wholesale shape", `€${wholesale.subscription.wholesaleEur}/mo`);
    }
    if (!Array.isArray(wholesale.growth_packs) || wholesale.growth_packs.length < 3) {
      fail("partners", "growth packs", "expected 3 packs in catalog");
    } else {
      pass("partners", "growth packs", `count=${wholesale.growth_packs.length}`);
    }
  }

  const hq = await probeApi("partners", "hq summary", "/api/platform/partners/hq", token, workspaceId);
  if (hq) {
    if (typeof hq.metrics !== "object") {
      fail("partners", "hq shape", "missing metrics");
    } else {
      pass("partners", "hq metrics", `clients=${hq.metrics?.total_clients ?? 0}`);
    }
    if (hq.connect) {
      assertConnectShape("partners", hq.connect, "hq connect banner state");
      if (connectStatus?.connect?.label && hq.connect.label !== connectStatus.connect.label) {
        warn("partners", "connect label sync", `hq=${hq.connect.label} status=${connectStatus.connect.label}`);
      }
    } else {
      fail("partners", "hq connect", "missing connect in hq payload");
    }
  }

  const ledger = await probeApi("partners", "ledger", "/api/platform/partners/ledger", token, workspaceId);
  if (ledger?.totals) {
    pass("partners", "ledger totals", `entries=${ledger.totals.entry_count ?? 0}`);
  }

  console.log("\n=== Billing ===");
  await probePage("billing", "/billing page", "/billing", token, workspaceId);

  const billingRes = await fetch(`${BASE}/api/v1/billing/summary`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "X-Workspace-Id": String(workspaceId),
    },
  });
  if (billingRes.status === 200) {
    pass("billing", "billing summary BFF", "HTTP 200");
  } else if (billingRes.status === 404) {
    warn("billing", "summary BFF", "HTTP 404 on web host — billing UI OK");
  } else if (billingRes.status >= 500) {
    fail("billing", "billing summary BFF", `HTTP ${billingRes.status}`);
  } else {
    pass("billing", "billing summary BFF", `HTTP ${billingRes.status}`);
  }

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
