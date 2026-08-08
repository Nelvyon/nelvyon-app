#!/usr/bin/env node
/**
 * Local optional runner for NELVYON security scanners (block 1).
 * Prefer CI (security-gates.yml). Local run requires gitleaks/trivy on PATH.
 *
 *   node scripts/nelvyon-security-scan.mjs --plan
 *   NELVYON_TRIVY_ENABLED=1 node scripts/nelvyon-security-scan.mjs --trivy
 *   NELVYON_GITLEAKS_ENABLED=1 node scripts/nelvyon-security-scan.mjs --gitleaks
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);

const plans = [
  {
    id: "gitleaks",
    enabled: process.env.NELVYON_GITLEAKS_ENABLED !== "0",
    cmd: ["gitleaks", "detect", "--source", ".", "--verbose", "--no-git"],
  },
  {
    id: "trivy",
    enabled: process.env.NELVYON_TRIVY_ENABLED !== "0",
    cmd: ["trivy", "fs", "--severity", "CRITICAL,HIGH", "--exit-code", "1", "apps/web"],
  },
];

if (args.includes("--plan")) {
  console.log(JSON.stringify(plans, null, 2));
  process.exit(0);
}

function run(plan) {
  if (!plan.enabled) {
    console.log(`[skip] ${plan.id} disabled by feature flag`);
    return 0;
  }
  console.log(`[run] ${plan.cmd.join(" ")}`);
  const r = spawnSync(plan.cmd[0], plan.cmd.slice(1), { cwd: root, stdio: "inherit", shell: process.platform === "win32" });
  if (r.error?.code === "ENOENT") {
    console.warn(`[warn] ${plan.id} CLI not installed — CI covers this gate`);
    return 0;
  }
  return r.status ?? 1;
}

let code = 0;
const wantG = args.includes("--gitleaks") || args.includes("--all") || args.length === 0;
const wantT = args.includes("--trivy") || args.includes("--all") || args.length === 0;
if (wantG) code = Math.max(code, run(plans[0]));
if (wantT) code = Math.max(code, run(plans[1]));
process.exit(code);
