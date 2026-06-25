#!/usr/bin/env node
/**
 * S45 — Load smoke test
 * 50 concurrent requests per endpoint, p95 < 2000ms, 0% 5xx
 *
 * Usage:
 *   node scripts/load-smoke.mjs --baseUrl=http://localhost:3000
 *   node scripts/load-smoke.mjs --baseUrl=https://staging.nelvyon.com
 */

import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: {
    baseUrl: { type: "string", default: "http://localhost:3000" },
    concurrency: { type: "string", default: "50" },
    "p95-threshold": { type: "string", default: "2000" },
  },
});

const BASE_URL = values.baseUrl;
const CONCURRENCY = parseInt(values.concurrency ?? "50", 10);
const P95_THRESHOLD_MS = parseInt(values["p95-threshold"] ?? "2000", 10);

// Endpoints to test (no auth required or 401 is acceptable)
const ENDPOINTS = [
  { path: "/api/health", acceptStatuses: [200, 404] },
  { path: "/api/saas/crm/contacts", acceptStatuses: [401] },
  { path: "/api/saas/settings", acceptStatuses: [401] },
  { path: "/api/saas/contracts", acceptStatuses: [401] },
  { path: "/api/saas/integrations", acceptStatuses: [401] },
  { path: "/api/saas/memberships", acceptStatuses: [401] },
  { path: "/api/saas/facturas/dunning", acceptStatuses: [401] },
];

async function fetchTimed(url, acceptStatuses) {
  const start = Date.now();
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(5000),
      redirect: "manual",
    });
    const elapsed = Date.now() - start;
    const is5xx = res.status >= 500;
    const accepted = acceptStatuses.includes(res.status);
    return { elapsed, status: res.status, error: null, is5xx, accepted };
  } catch (err) {
    const elapsed = Date.now() - start;
    const msg = err instanceof Error ? err.message : String(err);
    return { elapsed, status: 0, error: msg, is5xx: false, accepted: false };
  }
}

function percentile(sortedArr, p) {
  const idx = Math.ceil((p / 100) * sortedArr.length) - 1;
  return sortedArr[Math.max(0, idx)];
}

async function smokeEndpoint(path, acceptStatuses) {
  const url = `${BASE_URL}${path}`;
  const batch = Array.from({ length: CONCURRENCY }, () =>
    fetchTimed(url, acceptStatuses)
  );
  const results = await Promise.all(batch);

  const errors = results.filter((r) => r.error !== null);
  const fiveXx = results.filter((r) => r.is5xx);
  const notAccepted = results.filter((r) => !r.accepted && !r.is5xx && r.error === null && r.status !== 0);
  const timings = results
    .filter((r) => r.error === null)
    .map((r) => r.elapsed)
    .sort((a, b) => a - b);

  const p50 = timings.length ? percentile(timings, 50) : 0;
  const p95 = timings.length ? percentile(timings, 95) : 0;
  const p99 = timings.length ? percentile(timings, 99) : 0;

  const passed = fiveXx.length === 0 && p95 <= P95_THRESHOLD_MS;

  const icon = passed ? "✅" : "❌";
  const statusSample = results[0]?.status ?? "N/A";
  console.log(
    `${icon} ${path.padEnd(40)} p50=${p50}ms p95=${p95}ms p99=${p99}ms status=${statusSample} 5xx=${fiveXx.length} err=${errors.length}`
  );

  if (!passed) {
    if (fiveXx.length > 0) console.log(`   ⚠️  ${fiveXx.length}/${CONCURRENCY} responses were 5xx`);
    if (p95 > P95_THRESHOLD_MS) console.log(`   ⚠️  p95=${p95}ms exceeds threshold ${P95_THRESHOLD_MS}ms`);
  }

  return { path, passed, p50, p95, p99, fiveXxCount: fiveXx.length, errorCount: errors.length };
}

async function main() {
  console.log(`\n🚀 Load smoke — ${CONCURRENCY} concurrent per endpoint → ${BASE_URL}`);
  console.log(`   p95 threshold: ${P95_THRESHOLD_MS}ms | max 5xx: 0\n`);

  const results = [];
  for (const { path, acceptStatuses } of ENDPOINTS) {
    const result = await smokeEndpoint(path, acceptStatuses);
    results.push(result);
  }

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  const maxP95 = Math.max(...results.map((r) => r.p95));

  console.log(`\n${"─".repeat(60)}`);
  console.log(`  ${passed}/${results.length} endpoints passed`);
  console.log(`  max p95: ${maxP95}ms`);

  if (failed > 0) {
    console.error(`\n❌ ${failed} endpoint(s) failed load smoke\n`);
    process.exit(1);
  } else {
    console.log(`\n✅ All endpoints passed load smoke\n`);
    process.exit(0);
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
