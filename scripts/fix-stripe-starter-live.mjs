/**
 * Repara STRIPE_PRICE_ID_STARTER (y opcionalmente pro/agency) contra Stripe Live.
 *
 * Modo A — contra producción (usa STRIPE_SECRET_KEY del servicio Railway):
 *   CRON_SECRET=... node scripts/fix-stripe-starter-live.mjs
 *
 * Modo B — local con claves:
 *   STRIPE_SECRET_KEY=sk_live_... \
 *   RAILWAY_API_TOKEN=... RAILWAY_PROJECT_ID=... RAILWAY_ENVIRONMENT_ID=... RAILWAY_SERVICE_ID=... \
 *   node scripts/fix-stripe-starter-live.mjs --local
 *
 * Modo C — solo Stripe (sin Railway):
 *   STRIPE_SECRET_KEY=sk_live_... node scripts/fix-stripe-starter-live.mjs --local --no-railway
 */

import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const args = new Set(process.argv.slice(2));
const local = args.has("--local");
const noRailway = args.has("--no-railway");
const BASE = (process.env.E2E_BASE_URL ?? "https://nelvyon.com").replace(/\/$/, "");
const CRON_SECRET = process.env.CRON_SECRET?.trim();

async function runRemote() {
  if (!CRON_SECRET) {
    console.error("Falta CRON_SECRET para llamar a producción");
    process.exit(1);
  }

  console.error(`POST ${BASE}/api/billing/stripe-repair (fix starter)`);
  const res = await fetch(`${BASE}/api/billing/stripe-repair`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-cron-secret": CRON_SECRET,
    },
    body: JSON.stringify({ plans: ["starter", "pro", "agency"] }),
  });
  const body = await res.json().catch(() => ({}));
  console.log(JSON.stringify({ status: res.status, body }, null, 2));
  process.exit(res.ok && body.checkoutReady === true ? 0 : 1);
}

async function runLocal() {
  if (!process.env.STRIPE_SECRET_KEY?.trim() && !process.env.STRIPE_API_KEY?.trim()) {
    console.error("Falta STRIPE_SECRET_KEY");
    process.exit(1);
  }
  if (noRailway) {
    delete process.env.RAILWAY_API_TOKEN;
    delete process.env.RAILWAY_TOKEN;
  }

  // Cargar módulos TS compilados vía tsx
  const { register } = await import("tsx/esm/api");
  register();

  const { fixStripePrices, summarizeRepair } = await import(
    path.join(root, "backend/stripe/stripeRepair.ts")
  );
  const report = await fixStripePrices(["starter", "pro", "agency"]);
  console.log(summarizeRepair(report));
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.checkoutReady ? 0 : 1);
}

if (local) {
  await runLocal();
} else {
  await runRemote();
}
