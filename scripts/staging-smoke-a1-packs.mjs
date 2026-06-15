/**
 * Staging smoke — FASE A Growth Packs (pages + pack-report BFF).
 * Usage: node scripts/staging-smoke-a1-packs.mjs [--skip-wait]
 */
const BASE = "https://ideal-victory-staging.up.railway.app";
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
  for (let i = 1; i <= 30; i += 1) {
    try {
      const h = await fetch(`${BASE}/api/health/live`, { cache: "no-store" });
      const p = await fetch(`${BASE}/os/packs`, { cache: "no-store" });
      if (h.status === 200 && p.status !== 404) {
        console.log("DEPLOY_READY");
        return;
      }
    } catch {}
    await sleep(20000);
  }
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
  const res = await fetch(`${BASE}/api/platform/workspaces/list`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  if (!res.ok) {
    fail("auth", "workspaces", `status ${res.status}`);
    return "";
  }
  const data = await res.json();
  const items = data.items ?? data.workspaces ?? (Array.isArray(data) ? data : []);
  const id = items[0]?.id ?? items[0]?.workspace_id;
  if (!id) {
    fail("auth", "workspaces", "missing");
    return "";
  }
  pass("auth", "workspace", `id=${id}`);
  return String(id);
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
    fail("A1", name, `HTTP ${res.status}`);
    return;
  }
  const html = await res.text();
  for (const n of needles) {
    if (!html.toLowerCase().includes(n.toLowerCase())) {
      fail("A1", name, `missing "${n}"`);
      return;
    }
  }
  pass("A1", name, `HTTP 200`);
}

async function main() {
  console.log(`A1 Packs smoke → ${BASE}\n`);
  await waitForDeploy();
  const token = await login();
  const ws = await workspace(token);
  if (!ws) process.exit(1);

  await page("catalog", "/os/packs", token, ws, ["Growth", "Local"]);
  await page("local kickoff", "/os/packs/local-growth", token, ws, ["Local Growth", "Lanzar"]);
  await page("ecommerce kickoff", "/os/packs/ecommerce-growth", token, ws, ["Ecommerce Growth", "Lanzar"]);
  await page("saas kickoff", "/os/packs/saas-b2b-growth", token, ws, ["SaaS B2B", "Lanzar"]);
  await page("local report", "/dashboard/local-growth", token, ws, ["Local Growth", "pack"]);
  await page("ecommerce report", "/dashboard/ecommerce-growth", token, ws, ["Ecommerce", "pack"]);
  await page("saas report", "/dashboard/saas-b2b-growth", token, ws, ["SaaS B2B", "pack"]);

  const bff = await fetch(`${BASE}/api/platform/pack-report`, { headers: headers(token, ws) });
  if (bff.status === 200) pass("A1", "pack-report BFF", "HTTP 200");
  else fail("A1", "pack-report BFF", `HTTP ${bff.status}`);

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
