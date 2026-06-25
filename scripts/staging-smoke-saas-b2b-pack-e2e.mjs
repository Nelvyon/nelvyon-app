/**
 * Staging E2E — SaaS B2B Growth Pack production pilot.
 * Usage: node scripts/staging-smoke-saas-b2b-pack-e2e.mjs [--skip-wait]
 *
 * Flow: operator login → POST kickoff → portal invite → portal login → 5 deliverables sin mock://
 */
const BASE = process.env.STAGING_URL?.trim() || "https://ideal-victory-staging.up.railway.app";
const QA_EMAIL = "qa-audit-20260612@nelvyon.test";
const QA_PASSWORD = "StagingQA2026!";
const SKIP_WAIT = process.argv.includes("--skip-wait");

const RUN_ID = `saas-b2b-e2e-${Date.now()}`;
const PORTAL_EMAIL = `portal-saas-b2b-${RUN_ID}@nelvyon.test`;
const PORTAL_PASSWORD = "PortalSaasB2bQA2026!";
const PRODUCT_NAME = `QA SaaS B2B ${RUN_ID}`;

const EXPECTED_TITLES = [
  "Landing PLG",
  "Informe SEO B2B",
  "Bot demo",
  "Playbook outbound",
  "Informe ejecutivo",
];

const COOKIE = "nelvyon_token";
const CRITICAL = [];
const WARN = [];

function fail(m, c, d) { CRITICAL.push({ module: m, check: c, detail: d }); console.log(`FAIL [${m}] ${c}: ${d}`); }
function warn(m, c, d) { WARN.push({ module: m, check: c, detail: d }); console.log(`WARN [${m}] ${c}: ${d}`); }
function pass(m, c, d = "ok") { console.log(`PASS [${m}] ${c}: ${d}`); }
async function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

function containsMock(value) {
  if (typeof value === "string") return value.includes("mock://");
  if (Array.isArray(value)) return value.some(containsMock);
  if (value && typeof value === "object") return Object.values(value).some(containsMock);
  return false;
}

async function waitForDeploy() {
  if (SKIP_WAIT) { console.log("SKIP deploy wait"); return; }
  const MAX = 30;
  for (let i = 0; i < MAX; i++) {
    try {
      const r = await fetch(`${BASE}/api/health`);
      if (r.ok) { pass("deploy", "health", `ready after ${i * 10}s`); return; }
    } catch { /* wait */ }
    await sleep(10_000);
  }
  fail("deploy", "health", `not ready after ${MAX * 10}s`);
}

async function operatorLogin() {
  const r = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: QA_EMAIL, password: QA_PASSWORD }),
  });
  if (!r.ok) { fail("login", "operator-login", `status ${r.status}`); return null; }
  const data = await r.json();
  if (!data.token) { fail("login", "token", "missing token in response"); return null; }
  pass("login", "operator-login", `userId=${data.userId ?? "?"}`);
  return data.token;
}

async function kickoffPack(token) {
  const r = await fetch(`${BASE}/api/os/packs/saas-b2b-growth/kickoff`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      Cookie: `${COOKIE}=${token}`,
    },
    body: JSON.stringify({
      productName: PRODUCT_NAME,
      icp: "VP Engineering",
      pricingModel: "PLG freemium",
      commercialMotion: "product-led",
      portalEmail: PORTAL_EMAIL,
      portalPassword: PORTAL_PASSWORD,
    }),
  });
  if (!r.ok) { fail("kickoff", "post-kickoff", `status ${r.status}`); return null; }
  const body = await r.json();
  if (containsMock(body)) { fail("kickoff", "no-mock", "response contains mock://"); return null; }
  pass("kickoff", "post-kickoff", `packRunId=${body.packRunId ?? body.run_id ?? "?"}`);
  return body;
}

async function portalLogin() {
  const r = await fetch(`${BASE}/api/platform/portal/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: PORTAL_EMAIL, password: PORTAL_PASSWORD }),
  });
  if (!r.ok) { fail("portal", "login", `status ${r.status}`); return null; }
  const auth = await r.json();
  if (!auth.access_token) { fail("portal", "token", "missing access_token"); return null; }
  pass("portal", "login", "via platform BFF");
  return auth.access_token;
}

async function checkDeliverables(portalToken) {
  const r = await fetch(`${BASE}/api/platform/portal/deliverables`, {
    headers: { Authorization: `Bearer ${portalToken}`, Accept: "application/json" },
  });
  if (!r.ok) { fail("deliverables", "list", `status ${r.status}`); return; }
  const body = await r.json();
  const items = body.items ?? body.deliverables ?? [];
  const titles = items.map((d) => d.title ?? d.name ?? "");
  for (const expected of EXPECTED_TITLES) {
    if (titles.some((t) => t.toLowerCase().includes(expected.toLowerCase().split(" ")[0]))) {
      pass("deliverables", `present:${expected}`);
    } else {
      warn("deliverables", `missing:${expected}`, `got: ${titles.join(", ")}`);
    }
  }
  if (containsMock(body)) { fail("deliverables", "no-mock", "deliverables contain mock://"); }
  else pass("deliverables", "no-mock");
}

async function main() {
  console.log(`\n=== SaaS B2B Growth Pack E2E smoke [${RUN_ID}] ===\n`);
  await waitForDeploy();
  if (CRITICAL.length) { printSummary(); process.exit(1); }

  const opToken = await operatorLogin();
  if (!opToken) { printSummary(); process.exit(1); }

  const kickoffResult = await kickoffPack(opToken);
  if (!kickoffResult) { printSummary(); process.exit(1); }

  // Wait for pack to process (up to 90s)
  let portalToken = null;
  for (let i = 0; i < 9; i++) {
    await sleep(10_000);
    portalToken = await portalLogin().catch(() => null);
    if (portalToken) break;
    console.log(`  waiting for portal invite... (${(i + 1) * 10}s)`);
  }
  if (!portalToken) { fail("portal", "invite-timeout", "portal login not available after 90s"); printSummary(); process.exit(1); }

  await checkDeliverables(portalToken);
  printSummary();
  if (CRITICAL.length) process.exit(1);
  process.exit(0);
}

function printSummary() {
  console.log("\n--- SaaS B2B Pack E2E Summary ---");
  console.log(`CRITICAL: ${CRITICAL.length}  WARN: ${WARN.length}`);
  for (const c of CRITICAL) console.log(`  FAIL [${c.module}] ${c.check}: ${c.detail}`);
  for (const w of WARN) console.log(`  WARN [${w.module}] ${w.check}: ${w.detail}`);
  console.log(CRITICAL.length === 0 ? "ALL_PASS" : "CRITICAL_FAILS");
}

main().catch((e) => { console.error(e); process.exit(1); });
