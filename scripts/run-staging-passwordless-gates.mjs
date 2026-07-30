#!/usr/bin/env node
/**
 * Password-free staging gates (no STAGING_QA_PASSWORD).
 * Covers health + live sha + CSRF KI-020.
 * Honesty/workflows that require /api/auth/register stay Ops-gated when IP is rate-limited.
 *
 * Usage: node scripts/run-staging-passwordless-gates.mjs
 */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const base =
  process.env.STAGING_BASE_URL?.trim() ||
  process.env.CERT_BASE_URL?.trim() ||
  "https://ideal-victory-staging.up.railway.app";

async function healthLive() {
  const res = await fetch(`${base.replace(/\/$/, "")}/api/health/live`);
  const json = await res.json().catch(() => ({}));
  const ok = res.status === 200 && json?.ok === true;
  console.log(ok ? `PASS health/live sha=${json.git_sha ?? "?"}` : `FAIL health/live status=${res.status}`);
  return ok;
}

function run(script) {
  console.log(`\n========== ${script} ==========\n`);
  const r = spawnSync(process.execPath, [join(root, "scripts", script)], {
    cwd: root,
    stdio: "inherit",
    env: process.env,
  });
  return (r.status ?? 1) === 0;
}

const healthOk = await healthLive();
const csrfOk = run("staging-smoke-ki020-csrf.mjs");
console.log("\n========== PASSWORDLESS SUMMARY ==========");
console.log(`${healthOk ? "PASS" : "FAIL"}  health/live`);
console.log(`${csrfOk ? "PASS" : "FAIL"}  ki020-csrf`);
console.log(
  "NOTE  honesty/workflows require register — use STAGING_QA_PASSWORD via run-staging-p0-smokes.mjs if IP rate-limited",
);
process.exit(healthOk && csrfOk ? 0 : 1);
