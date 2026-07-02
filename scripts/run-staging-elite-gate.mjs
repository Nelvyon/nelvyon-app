/**
 * Elite gate — P0 (3 growth packs) + beta packs E2E.
 * Usage: node scripts/run-staging-elite-gate.mjs [--skip-wait]
 */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const skipWait = process.argv.includes("--skip-wait");
const extraArgs = skipWait ? ["--skip-wait"] : [];

const GATES = [
  { name: "P0", script: "run-staging-p0-smokes.mjs" },
  { name: "beta-packs", script: "run-staging-beta-packs-e2e.mjs" },
];

let failed = false;
for (const gate of GATES) {
  console.log(`\n========== ELITE GATE: ${gate.name} ==========\n`);
  const r = spawnSync(process.execPath, [join(__dirname, gate.script), ...extraArgs], {
    cwd: root,
    stdio: "inherit",
    env: process.env,
  });
  if (r.status !== 0) {
    failed = true;
    console.log(`\n${gate.name.toUpperCase()}_FAIL\n`);
    break;
  }
  console.log(`\n${gate.name.toUpperCase()}_PASS\n`);
}

if (failed) {
  console.log("ELITE_GATE_FAIL");
  process.exit(1);
}
console.log("ALL_ELITE_GATE_PASS");
process.exit(0);
