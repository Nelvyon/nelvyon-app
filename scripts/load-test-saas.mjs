#!/usr/bin/env node
/**
 * Lightweight SaaS load smoke — hits public health + auth-gated routes with concurrency.
 * Usage: node scripts/load-test-saas.mjs [--base http://localhost:3000] [--n 50]
 */
const args = process.argv.slice(2);
function arg(name, fallback) {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
}

const base = arg("--base", process.env.LOAD_TEST_BASE ?? "http://localhost:3000").replace(/\/$/, "");
const n = Math.min(Math.max(Number(arg("--n", "30")), 1), 200);

async function hit(path) {
  const t0 = performance.now();
  const res = await fetch(`${base}${path}`, { redirect: "manual" });
  const ms = Math.round(performance.now() - t0);
  return { path, status: res.status, ms };
}

async function main() {
  const paths = ["/api/health", "/api/lms/public/courses", "/api/saas/crm/dedupe"];
  const tasks = [];
  for (let i = 0; i < n; i++) {
    tasks.push(hit(paths[i % paths.length]));
  }
  const results = await Promise.all(tasks);
  const byPath = new Map();
  for (const r of results) {
    const list = byPath.get(r.path) ?? [];
    list.push(r);
    byPath.set(r.path, list);
  }
  console.log(`Load smoke: ${n} requests → ${base}`);
  for (const [path, list] of byPath) {
    const avg = Math.round(list.reduce((s, x) => s + x.ms, 0) / list.length);
    const max = Math.max(...list.map((x) => x.ms));
    const ok = list.filter((x) => x.status < 500).length;
    console.log(`  ${path}: ok=${ok}/${list.length} avg=${avg}ms max=${max}ms`);
  }
  const failures = results.filter((r) => r.status >= 500);
  if (failures.length > 0) {
    console.error(`FAIL: ${failures.length} server errors`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
