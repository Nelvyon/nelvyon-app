/**
 * Staging smoke — Stripe checkout + webhook readiness (P0 billing).
 * Usage: node scripts/staging-smoke-stripe-billing.mjs [--skip-wait]
 *
 * Validates:
 *  - Deep health exposes Stripe component
 *  - Webhook rejects unsigned payloads (400/503, never 200)
 *  - Checkout requires auth (401 without cookie)
 *  - Authenticated checkout returns Stripe URL or explicit 503 missing-env
 *  - SaaS billing summary exposes stripeConfigured flag
 */
import { finishSmokeGate } from "./lib/smoke-summary.mjs";

const BASE = process.env.STAGING_BASE_URL?.trim() || "https://nelvyon.com";
const QA_EMAIL = process.env.STRIPE_SMOKE_EMAIL?.trim() || "qa-audit-20260612@nelvyon.test";
const QA_PASSWORD = process.env.STRIPE_SMOKE_PASSWORD?.trim() || "StagingQA2026!";
const SKIP_WAIT = process.argv.includes("--skip-wait");

const CRITICAL = [];
const WARN = [];

function fail(module, check, detail) {
  CRITICAL.push({ module, check, detail });
  console.log(`FAIL [${module}] ${check}: ${detail}`);
}

function warn(module, check, detail) {
  WARN.push({ module, check, detail });
  console.log(`WARN [${module}] ${check}: ${detail}`);
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
  console.log("Waiting for staging deploy (Stripe billing BFF)…");
  for (let i = 1; i <= 12; i += 1) {
    try {
      const live = await fetch(`${BASE}/api/health/live`, { cache: "no-store" });
      const webhook = await fetch(`${BASE}/api/webhooks/stripe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      console.log(JSON.stringify({ attempt: i, live: live.status, webhookProbe: webhook.status }));
      if (live.status === 200 && webhook.status !== 404) {
        console.log("DEPLOY_READY");
        return;
      }
    } catch (e) {
      console.log(JSON.stringify({ attempt: i, error: String(e) }));
    }
    await sleep(10000);
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

async function checkDeepHealthStripe() {
  const cronSecret = process.env.CRON_SECRET?.trim();
  const headers = cronSecret ? { "x-cron-secret": cronSecret } : {};
  const res = await fetch(`${BASE}/api/health/deep`, { cache: "no-store", headers });
  if (res.status === 401 && !cronSecret) {
    warn("health", "deep_auth", "CRON_SECRET not set locally — skipping deep health (401 expected)");
    return;
  }
  if (!res.ok) {
    fail("health", "deep", `status ${res.status}`);
    return;
  }
  const body = await res.json();
  const stripe = body?.checks?.stripe ?? body?.stripe;
  if (!stripe) {
    fail("health", "stripe_component", "missing stripe check in deep health");
    return;
  }
  pass("health", "stripe_component", `status=${stripe.status ?? stripe.ok ?? "unknown"}`);
  if (stripe.status === "degraded" || stripe.ok === false) {
    warn("health", "stripe_configured", stripe.error ?? "Stripe degraded — set Railway vars");
  }
}

async function checkWebhookSignatureGate() {
  const res = await fetch(`${BASE}/api/webhooks/stripe`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "stripe-signature": "invalid_probe" },
    body: JSON.stringify({ id: "evt_probe", type: "ping" }),
  });
  if (res.status === 200) {
    fail("webhook", "signature_gate", "unsigned/invalid payload returned 200");
    return;
  }
  if (res.status === 400 || res.status === 503) {
    pass("webhook", "signature_gate", `status=${res.status}`);
    return;
  }
  warn("webhook", "signature_gate", `unexpected status ${res.status}`);
}

async function checkCheckoutUnauthenticated() {
  const res = await fetch(`${BASE}/api/billing/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ planId: "pro" }),
  });
  if (res.status === 401) {
    pass("checkout", "auth_required", "401 without session");
    return;
  }
  fail("checkout", "auth_required", `expected 401, got ${res.status}`);
}

async function checkCheckoutAuthenticated(token) {
  const res = await fetch(`${BASE}/api/billing/checkout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: `nelvyon_token=${token}`,
    },
    body: JSON.stringify({ planId: "pro" }),
  });
  const json = await res.json().catch(() => ({}));

  if (res.status === 200 && json.url?.startsWith("https://checkout.stripe.com")) {
    pass("checkout", "session_url", `sessionId=${json.sessionId ?? "?"}`);
    return;
  }
  if (res.status === 503 && (json.code === "missing_stripe_secret" || json.code === "missing_stripe_price")) {
    warn("checkout", "stripe_env", json.error ?? json.code);
    return;
  }
  if (res.status === 502) {
    warn("checkout", "stripe_api", json.error ?? "Stripe API error");
    return;
  }
  fail("checkout", "session", `status=${res.status} body=${JSON.stringify(json).slice(0, 200)}`);
}

async function checkSaasBillingSummary(token) {
  const res = await fetch(`${BASE}/api/saas/billing`, {
    headers: { Cookie: `nelvyon_token=${token}` },
    cache: "no-store",
  });
  if (!res.ok) {
    fail("billing", "summary", `status ${res.status}`);
    return;
  }
  const json = await res.json();
  if (typeof json.stripeConfigured !== "boolean") {
    fail("billing", "stripeConfigured_flag", "missing boolean stripeConfigured");
    return;
  }
  pass("billing", "summary", `plan=${json.tenant?.plan} stripeConfigured=${json.stripeConfigured}`);
  if (json.billingNote && typeof json.billingNote === "string") {
    pass("billing", "billingNote", json.billingNote.slice(0, 80));
  }
}

async function main() {
  console.log(`STRIPE_BILLING_SMOKE base=${BASE}`);
  await waitForDeploy();

  await checkDeepHealthStripe();
  await checkWebhookSignatureGate();
  await checkCheckoutUnauthenticated();

  try {
    const token = await login();
    await checkSaasBillingSummary(token);
    await checkCheckoutAuthenticated(token);
  } catch (e) {
    fail("auth", "login", String(e));
  }

  process.exit(finishSmokeGate({ critical: CRITICAL, warn: WARN, passLabel: "STRIPE_BILLING_PASS" }));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
