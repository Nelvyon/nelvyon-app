#!/usr/bin/env node
/**
 * Phase 1 local audit — typecheck, lint, elite reinforce, migrations, env docs.
 * Usage: node scripts/run-phase1-audit.mjs
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function run(label, cmd, args, cwd = root) {
  console.log(`\n========== ${label} ==========\n`);
  const r = spawnSync(cmd, args, { cwd, stdio: "inherit", shell: process.platform === "win32", env: process.env });
  const code = r.status ?? 1;
  console.log(`\n>>> ${label}: ${code === 0 ? "PASS" : "FAIL"} (exit ${code})\n`);
  return code;
}

const steps = [
  ["migrations-elite", "node", ["scripts/validate-saas-migrations.mjs"]],
  ["migrations-post-elite", "node", ["scripts/validate-post-elite-migrations.mjs"]],
  ["typecheck", "pnpm", ["exec", "tsc", "--noEmit"], path.join(root, "apps/web")],
  ["lint", "pnpm", ["lint"], path.join(root, "apps/web")],
  ["elite-reinforce", "node", ["scripts/run-local-elite-reinforce.mjs"]],
];

let failed = false;
for (const [label, cmd, args, cwd] of steps) {
  if (run(label, cmd, args, cwd) !== 0) failed = true;
}

if (failed) {
  console.log("PHASE1_AUDIT_FAIL");
  process.exit(1);
}
console.log("PHASE1_AUDIT_PASS");
process.exit(0);
