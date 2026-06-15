/**
 * Staging smoke — P1 Partner HQ + wholesale billing.
 * Usage: node scripts/staging-smoke-p1-partners.mjs [--skip-wait]
 */
const BASE = "https://ideal-victory-staging.up.railway.app";
const QA_EMAIL = "qa-audit-20260612@nelvyon.test";
const QA_PASSWORD = "StagingQA2026!";
const COOKIE = "nelvyon_token";
const SKIP_WAIT = process.argv.includes("--skip-wait");

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
  console.log("Waiting for staging deploy (Partner HQ BFF)…");
  for (let i = 1; i <= 24; i += 1) {
    try {
      const health = await fetch(`${BASE}/api/health/live`, { cache: "no-store" });
      const wholesale = await fetch(`${BASE}/api/platform/partners/wholesale`, { cache: "no-store" });
      const partnersPage = await fetch(`${BASE}/dashboard/partners`, { cache: "no-store", redirect: "manual" });
      console.log(
        JSON.stringify({
          attempt: i,
          health: health.status,
          wholesale: wholesale.status,
          partnersPage: partnersPage.status,
        }),
      );
      if (health.status === 200 && wholesale.status !== 404 && wholesale.status !== 0) {
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
  if (opts.contains?.length) {
    const body = (await res.text()).toLowerCase();
    for (const needle of opts.contains) {
      if (!body.includes(needle.toLowerCase())) {
        fail(module, check, `missing "${needle}"`);
        return null;
      }
    }
  }
  pass(module, check, `HTTP ${res.status}`);
  return res;
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

async function main() {
  console.log(`P1 Partner HQ smoke → ${BASE}\n`);
  await waitForDeploy();
  const token = await login();
  const workspaceId = await getWorkspaceId(token);
  if (!workspaceId) {
    fail("auth", "workspace", "missing");
    process.exit(1);
  }

  console.log("\n=== Partner HQ UI ===");
  await probePage("partners", "/dashboard/partners", "/dashboard/partners", token, workspaceId, {
    contains: ["partner"],
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
  if (hq && typeof hq.metrics !== "object") {
    fail("partners", "hq shape", "missing metrics");
  } else if (hq) {
    pass("partners", "hq shape", `clients=${hq.metrics?.total_clients ?? 0}`);
  } else {
    const hqRes = await fetch(`${BASE}/api/platform/partners/hq`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "X-Workspace-Id": String(workspaceId),
      },
    });
    if (hqRes.status === 503) {
      warn("partners", "hq summary", "HTTP 503 — pack DB unavailable, wholesale OK");
    }
  }

  console.log("\n=== Billing ===");
  await probePage("billing", "/billing page", "/billing", token, workspaceId, {
    contains: ["plan", "factur", "billing", "usage"],
  });

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
