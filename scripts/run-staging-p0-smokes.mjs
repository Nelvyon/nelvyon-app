/**
 * Run P0 staging smokes against live staging (PASS/FAIL gate).
 * Usage: node scripts/run-staging-p0-smokes.mjs [--skip-wait]
 *
 * Smokes:
 *  1. staging-smoke-portal-packs.mjs
 *  2. staging-smoke-local-pack-e2e.mjs    (local-business-growth)
 *  3. staging-smoke-ecommerce-pack-e2e.mjs (ecommerce-growth)
 *  4. staging-smoke-saas-b2b-pack-e2e.mjs  (saas-b2b-growth)
 */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const skipWait = process.argv.includes("--skip-wait");
const extraArgs = skipWait ? ["--skip-wait"] : [];

const SMOKES = [
  { name: "portal-packs", script: "staging-smoke-portal-packs.mjs" },
  { name: "local-pack-e2e", script: "staging-smoke-local-pack-e2e.mjs" },
  { name: "ecommerce-pack-e2e", script: "staging-smoke-ecommerce-pack-e2e.mjs" },
  { name: "saas-b2b-pack-e2e", script: "staging-smoke-saas-b2b-pack-e2e.mjs" },
];

const results = [];

for (const smoke of SMOKES) {
  console.log(`\n========== P0 SMOKE: ${smoke.name} ==========\n`);
  const r = spawnSync(process.execPath, [join(__dirname, smoke.script), ...extraArgs], {
    cwd: root,
    stdio: "inherit",
    env: process.env,
  });
  const code = r.status ?? 1;
  const pass = code === 0;
  results.push({ name: smoke.name, pass, code });
  console.log(`\n>>> ${smoke.name}: ${pass ? "PASS" : "FAIL"} (exit ${code})\n`);
  if (!pass) break;
}

console.log("\n========== P0 SUMMARY ==========");
for (const r of results) {
  console.log(`${r.pass ? "PASS" : "FAIL"}  ${r.name}`);
}
const allPass = results.every((r) => r.pass) && results.length === SMOKES.length;
if (allPass) {
  console.log("ALL_P0_PASS");
  process.exit(0);
}
console.log("P0_FAIL");
process.exit(1);
