/**
 * Orchestrator — beta pack E2E smokes (5 packs).
 * Usage: node scripts/run-staging-beta-packs-e2e.mjs [--skip-wait]
 */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const skipWait = process.argv.includes("--skip-wait");
const extraArgs = skipWait ? ["--skip-wait"] : [];

console.log("\n========== BETA PACKS E2E GATE ==========\n");
const r = spawnSync(
  process.execPath,
  [join(__dirname, "staging-smoke-beta-packs-e2e.mjs"), ...extraArgs],
  { cwd: root, stdio: "inherit", env: process.env },
);

if (r.status === 0) {
  console.log("\nALL_BETA_PACKS_PASS");
  process.exit(0);
}
console.log("\nBETA_PACKS_FAIL");
process.exit(r.status ?? 1);
