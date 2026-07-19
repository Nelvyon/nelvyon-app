#!/usr/bin/env node
/**
 * Autonomous workforce certification harness (ADR-027).
 * Independent of Phase 2 Elite PASS.
 *
 * Usage: node scripts/run-workforce-cert.mjs
 * Verdict: FAIL | CONDITIONAL_PASS | PASS (PASS only with full evidence — not forced)
 */

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "backend", "local-ai", "benchmarks");
mkdirSync(outDir, { recursive: true });

function run(cmd, args) {
  const r = spawnSync(cmd, args, { cwd: root, encoding: "utf8", shell: true, env: process.env });
  return { status: r.status ?? 1, out: (r.stdout || "") + (r.stderr || "") };
}

const steps = [];

{
  const r = run("pnpm", ["-C", "apps/web", "exec", "tsc", "--noEmit"]);
  steps.push({ id: "typecheck", required: true, ok: r.status === 0 });
}

{
  const files = [
    "backend/saas/__tests__/workforceBlockB.test.ts",
    "backend/saas/__tests__/phase2Elite.test.ts",
    "backend/saas/__tests__/phase2Runtime.test.ts",
  ];
  const r = run("pnpm", ["-C", "apps/web", "exec", "vitest", "run", ...files, "--reporter=dot"]);
  steps.push({ id: "workforce_and_elite_regression", required: true, ok: r.status === 0, detail: r.status === 0 ? "pass" : r.out.slice(-600) });
}

{
  const ok =
    existsSync(join(root, "docs/AGENT_WORKFORCE_INVENTORY.md")) &&
    existsSync(join(root, "backend/agents/workforce/hierarchy.ts"));
  steps.push({ id: "inventory_and_hierarchy", required: true, ok });
}

{
  const freeze = [
    "backend/local-ai/benchmarks/router_certification_final.json",
    "backend/local-ai/benchmarks/mcp_certification_final.json",
    "backend/local-ai/benchmarks/phase2_elite_certification.json",
  ];
  const missing = freeze.filter((f) => !existsSync(join(root, f)));
  steps.push({ id: "phase1_phase2_freeze", required: true, ok: missing.length === 0, detail: missing.join(",") || "ok" });
}

const requiredOk = steps.filter((s) => s.required).every((s) => s.ok);
// Full PASS requires all permanent agents certified with evals+tools — not yet.
const verdict = requiredOk ? "CONDITIONAL_PASS" : "FAIL";
const report = {
  schema: "nelvyon.autonomous.workforce.cert.v1",
  generatedAt: new Date().toISOString(),
  verdict,
  nelvyonAutonomousWorkforceCertified: false,
  rationale:
    verdict === "CONDITIONAL_PASS"
      ? "Inventory+hierarchy+ephemeral workers+persist/kill-switch tests green. Not all permanent agents have evals/tools/workflows; aliases deprecated; no mass minting."
      : "Required workforce gates failed.",
  steps,
  blockers: [
    "7_runtime_agents_without_eval",
    "13_design_only_not_promoted",
    "toolIdMap_incomplete",
    "persistent_scheduler_daemon_not_shipped",
  ],
  notClaimed: ["NELVYON_AUTONOMOUS_WORKFORCE_CERTIFIED", "world_class_agents", "hundreds_of_permanent_agents"],
};

const outPath = join(outDir, "workforce_certification.json");
writeFileSync(outPath, JSON.stringify(report, null, 2), "utf8");
console.log(JSON.stringify(report, null, 2));
console.log(`\nWrote ${outPath}`);
process.exit(requiredOk ? 0 : 1);
