/**
 * Fase 0 — E2E producción/staging
 *
 * Uso:
 *   node scripts/e2e-phase0-prod.mjs
 *   E2E_BASE_URL=https://ideal-victory-staging.up.railway.app node scripts/e2e-phase0-prod.mjs
 */

const BASE = (process.env.E2E_BASE_URL ?? process.env.STAGING_WEB_URL ?? "https://nelvyon.com").replace(/\/$/, "");

const REQUIRED = [
  "health_live",
  "health_ready",
  "health_deep",
  "register",
  "login",
  "me",
  "forgot_password",
];

const OPTIONAL = ["checkout_starter"];

async function fetchJson(url, init) {
  const r = await fetch(url, init);
  const text = await r.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = { raw: text.slice(0, 500) };
  }
  return { status: r.status, body, headers: r.headers };
}

async function main() {
  const ts = Date.now();
  const email = `e2e-phase0-${ts}@mailinator.com`;
  const password = "E2eTest1234!";
  const out = {
    base: BASE,
    ts,
    email,
    steps: {},
    required: {},
    optional: {},
    pass: false,
  };

  out.steps.health_live = await fetchJson(`${BASE}/api/health/live`);
  out.required.health_live = out.steps.health_live.status === 200;

  out.steps.health_ready = await fetchJson(`${BASE}/api/health/ready`);
  out.required.health_ready =
    out.steps.health_ready.status === 200 && out.steps.health_ready.body?.status === "ready";

  out.steps.health_deep = await fetchJson(`${BASE}/api/health/deep`);
  out.required.health_deep =
    out.steps.health_deep.status === 200 && out.steps.health_deep.body?.status === "healthy";

  out.steps.register = await fetchJson(`${BASE}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, name: "E2E Phase 0" }),
  });
  out.required.register = out.steps.register.status === 200 && Boolean(out.steps.register.body?.token);

  const regToken = out.steps.register.body?.token;
  if (!regToken) {
    out.pass = false;
    console.log(JSON.stringify(out, null, 2));
    process.exit(1);
  }

  out.steps.login = await fetchJson(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  out.required.login = out.steps.login.status === 200 && Boolean(out.steps.login.body?.token);

  const loginToken = out.steps.login.body?.token ?? regToken;
  const cookie = `nelvyon_token=${loginToken}`;

  out.steps.me = await fetchJson(`${BASE}/api/auth/me`, {
    headers: { Cookie: cookie, Authorization: `Bearer ${loginToken}` },
  });
  out.required.me = out.steps.me.status === 200 && out.steps.me.body?.email === email;

  out.steps.forgot_password = await fetchJson(`${BASE}/api/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  out.required.forgot_password =
    out.steps.forgot_password.status === 200 && out.steps.forgot_password.body?.ok === true;

  out.steps.checkout_starter = await fetchJson(`${BASE}/api/billing/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ planId: "starter" }),
  });
  out.optional.checkout_starter =
    out.steps.checkout_starter.status === 200 && Boolean(out.steps.checkout_starter.body?.url);

  out.pass = REQUIRED.every((key) => out.required[key] === true);

  console.log(JSON.stringify(out, null, 2));
  process.exit(out.pass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
