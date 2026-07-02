/**
 * Elite gate — local reinforce + P0 + beta packs E2E + OS/SaaS 100%.
 * Zero tolerance: any CRITICAL or WARN fails the gate.
 * Usage: node scripts/run-staging-elite-gate.mjs [--skip-wait] [--skip-local]
 */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { installScriptTimeoutGuard } from "./lib/smoke-fetch.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const skipWait = process.argv.includes("--skip-wait");
const skipLocal = process.argv.includes("--skip-local");
const extraArgs = skipWait ? ["--skip-wait"] : [];
const clearGuard = installScriptTimeoutGuard(115 * 60 * 1000, "elite-gate");

const LOCAL_GATES = skipLocal
  ? []
  : [{ name: "local-reinforce", script: "run-local-elite-reinforce.mjs" }];

const GATES = [
  { name: "P0", script: "run-staging-p0-smokes.mjs" },
  { name: "beta-packs", script: "run-staging-beta-packs-e2e.mjs" },
  { name: "os-saas-100", script: "verify-os-saas-100.mjs" },
];

let failed = false;
for (const gate of [...LOCAL_GATES, ...GATES]) {
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
  clearGuard();
  process.exit(1);
}
console.log("ALL_ELITE_GATE_PASS");
clearGuard();
process.exit(0);
