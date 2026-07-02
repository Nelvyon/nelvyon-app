/**
 * Verifica OS y SaaS por separado contra prod (o STAGING_BASE_URL).
 * Usage:
 *   node scripts/verify-os-saas-100.mjs --os-only
 *   node scripts/verify-os-saas-100.mjs --saas-only
 *   node scripts/verify-os-saas-100.mjs
 */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const osOnly = process.argv.includes("--os-only");
const saasOnly = process.argv.includes("--saas-only");
const skipWait = process.argv.includes("--skip-wait") ? ["--skip-wait"] : [];

function run(script) {
  const r = spawnSync(process.execPath, [join(root, "scripts", script), ...skipWait], {
    cwd: root,
    stdio: "inherit",
    env: process.env,
  });
  return r.status ?? 1;
}

let exit = 0;

if (!saasOnly) {
  console.log("\n========== OS 100% GATE ==========\n");
  if (run("staging-smoke-os-all-services.mjs") !== 0) exit = 1;
}

if (!osOnly) {
  console.log("\n========== SaaS 100% GATE ==========\n");
  if (run("staging-smoke-saas-all-modules.mjs") !== 0) exit = 1;
}

if (exit === 0) {
  console.log("\n✅ OS + SaaS prod smokes: ALL_CRITICAL_PASS\n");
} else {
  console.log("\n❌ OS or SaaS smoke failed — see logs above\n");
}

process.exit(exit);
