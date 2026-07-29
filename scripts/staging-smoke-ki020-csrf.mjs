/**
 * Staging smoke KI-020 — CSRF Origin on cookie-authenticated SaaS mutations.
 * Uses a dummy cookie (middleware only checks presence) — no real credentials.
 *
 * Usage: node scripts/staging-smoke-ki020-csrf.mjs
 * Env: STAGING_WEB_URL (default https://ideal-victory-staging.up.railway.app)
 */
import { finishSmokeGate } from "./lib/smoke-summary.mjs";

const BASE = (process.env.STAGING_WEB_URL || process.env.STAGING_BASE_URL || "https://ideal-victory-staging.up.railway.app").replace(
  /\/$/,
  "",
);
const PATH = "/api/saas/team"; // mutating POST under /api/saas/*
const CRITICAL = [];
const WARN = [];

function fail(check, detail) {
  CRITICAL.push({ module: "ki020", check, detail });
  console.log(`FAIL [ki020] ${check}: ${detail}`);
}
function pass(check, detail = "ok") {
  console.log(`PASS [ki020] ${check}: ${detail}`);
}
function warn(check, detail) {
  WARN.push({ module: "ki020", check, detail });
  console.log(`WARN [ki020] ${check}: ${detail}`);
}

async function post(headers) {
  const res = await fetch(`${BASE}${PATH}`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Cookie: "nelvyon_token=ki020-smoke-dummy",
      ...headers,
    },
    body: "{}",
    redirect: "manual",
  });
  let body = "";
  try {
    body = await res.text();
  } catch {
    body = "";
  }
  let code = null;
  try {
    code = JSON.parse(body)?.code ?? null;
  } catch {
    /* ignore */
  }
  return { status: res.status, code, body: body.slice(0, 200) };
}

async function main() {
  console.log(`KI-020 CSRF smoke → ${BASE}${PATH}\n`);

  const noOrigin = await post({});
  if (noOrigin.status === 403 && String(noOrigin.code || "").includes("CSRF_ORIGIN")) {
    pass("cookie+no Origin", `HTTP ${noOrigin.status} code=${noOrigin.code}`);
  } else {
    fail("cookie+no Origin", `expected 403 CSRF_ORIGIN_*; got ${noOrigin.status} ${noOrigin.code || noOrigin.body}`);
  }

  const evil = await post({ Origin: "https://evil.example" });
  if (evil.status === 403 && String(evil.code || "").includes("CSRF_ORIGIN")) {
    pass("cookie+evil Origin", `HTTP ${evil.status} code=${evil.code}`);
  } else {
    fail("cookie+evil Origin", `expected 403 CSRF_ORIGIN_*; got ${evil.status} ${evil.code || evil.body}`);
  }

  const apex = await post({ Origin: "https://ideal-victory-staging.up.railway.app" });
  if (apex.status === 403 && String(apex.code || "").includes("CSRF_ORIGIN")) {
    fail(
      "cookie+Origin staging apex",
      `CSRF blocked staging apex — check NEXT_PUBLIC_APP_URL / NEXTAUTH_URL / NELVYON_CSRF_ALLOWED_ORIGINS include https://ideal-victory-staging.up.railway.app (${apex.code})`,
    );
  } else if (apex.status === 403) {
    warn("cookie+Origin staging apex", `HTTP 403 non-CSRF code=${apex.code || apex.body}`);
  } else {
    pass("cookie+Origin staging apex", `CSRF passed → handler HTTP ${apex.status} (auth may still fail)`);
  }

  const appHost = await post({ Origin: "https://app.nelvyon.com" });
  if (appHost.status === 403 && String(appHost.code || "").includes("CSRF_ORIGIN")) {
    fail(
      "cookie+Origin app.nelvyon.com",
      `CSRF blocks app subdomain — add https://app.nelvyon.com to NELVYON_CSRF_ALLOWED_ORIGINS (or NEXT_PUBLIC_APP_URL). code=${appHost.code}`,
    );
  } else if (appHost.status === 403) {
    warn("cookie+Origin app.nelvyon.com", `HTTP 403 non-CSRF code=${appHost.code || appHost.body}`);
  } else {
    pass("cookie+Origin app.nelvyon.com", `CSRF passed → handler HTTP ${appHost.status}`);
  }

  console.log("\n=== SUMMARY ===");
  process.exit(finishSmokeGate({ critical: CRITICAL, warn: WARN, passLabel: "KI020_PASS" }));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
