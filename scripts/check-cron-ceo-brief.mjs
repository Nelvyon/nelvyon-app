#!/usr/bin/env node
/** POST local cron CEO brief (use inside Railway container or with CRON_SECRET). */
const secret = process.env.CRON_SECRET;
const base = process.env.CHECK_URL ?? "http://127.0.0.1:8080";
if (!secret) {
  console.error("CRON_SECRET required");
  process.exit(1);
}
const res = await fetch(`${base}/api/cron/saas-ceo-brief`, {
  method: "POST",
  headers: { Authorization: `Bearer ${secret}` },
});
const body = await res.text();
console.log(JSON.stringify({ status: res.status, body: body.slice(0, 500) }, null, 2));
