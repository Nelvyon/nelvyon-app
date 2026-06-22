/**
 * Audita STRIPE_PRICE_ID_* contra Stripe Live/Test (stripe.prices.retrieve).
 *
 * Uso:
 *   CRON_SECRET=... node scripts/audit-stripe-live-prices.mjs
 *   CRON_SECRET=... E2E_BASE_URL=https://nelvyon.com node scripts/audit-stripe-live-prices.mjs
 */

const BASE = (process.env.E2E_BASE_URL ?? "https://nelvyon.com").replace(/\/$/, "");
const CRON_SECRET = process.env.CRON_SECRET?.trim();

async function main() {
  if (!CRON_SECRET) {
    console.error("Falta CRON_SECRET en el entorno");
    process.exit(1);
  }

  const res = await fetch(`${BASE}/api/billing/price-audit`, {
    headers: { "x-cron-secret": CRON_SECRET },
  });
  const body = await res.json().catch(() => ({}));
  console.log(JSON.stringify({ status: res.status, body }, null, 2));
  process.exit(res.ok && body.allValid === true ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
