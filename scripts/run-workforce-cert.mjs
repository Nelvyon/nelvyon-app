#!/usr/bin/env node
/**
 * Autonomous workforce certification harness (ADR-027 / Blocks A–H).
 * Independent of Phase 2 Elite PASS — does not force workforce PASS.
 *
 * Usage: node scripts/run-workforce-cert.mjs
 * Verdict: FAIL | CONDITIONAL_PASS | PASS
 * nelvyonAutonomousWorkforceCertified=true only when all mandatory internal gates pass.
 */

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "backend", "local-ai", "benchmarks");
mkdirSync(outDir, { recursive: true });

function run(cmd, args, env = {}) {
  const r = spawnSync(cmd, args, {
    cwd: root,
    encoding: "utf8",
    shell: true,
    env: { ...process.env, ...env },
  });
  return { status: r.status ?? 1, out: (r.stdout || "") + (r.stderr || "") };
}

function gitCommit() {
  const r = spawnSync("git", ["rev-parse", "--short", "HEAD"], {
    cwd: root,
    encoding: "utf8",
    shell: true,
  });
  return (r.stdout || "unknown").trim();
}

const steps = [];
const skipped = [];
const blockers = [];

{
  const r = run("pnpm", ["-C", "apps/web", "exec", "tsc", "--noEmit"]);
  steps.push({ id: "typecheck", required: true, ok: r.status === 0, detail: r.status === 0 ? "pass" : r.out.slice(-800) });
}

{
  const files = [
    "backend/saas/__tests__/workforceBlockB.test.ts",
    "backend/saas/__tests__/workforceBlockC.test.ts",
    "backend/saas/__tests__/workforceBlockDEFG.test.ts",
    "backend/saas/__tests__/phase2Elite.test.ts",
    "backend/saas/__tests__/phase2Runtime.test.ts",
  ];
  const r = run("pnpm", ["-C", "apps/web", "exec", "vitest", "run", ...files, "--reporter=dot"]);
  steps.push({
    id: "workforce_and_elite_regression",
    required: true,
    ok: r.status === 0,
    detail: r.status === 0 ? "pass" : r.out.slice(-1200),
  });
}

{
  const docs = [
    "docs/AGENT_WORKFORCE_INVENTORY.md",
    "docs/AUTONOMOUS_RUNTIME.md",
    "docs/AUTONOMOUS_WORKFORCE_CERT.md",
    "docs/AGENT_WORKFLOW_CATALOG.md",
    "docs/AGENT_CAPABILITY_MATRIX.md",
    "docs/AGENT_TOOL_PERMISSION_MATRIX.md",
    "docs/AGENT_EVALUATION_FRAMEWORK.md",
    "docs/AGENT_WORKFORCE_ORGANIZATION.md",
    "docs/CURSOR_OPEN_SOURCE_INTEGRATION_AUDIT.md",
    "backend/agents/workforce/hierarchy.ts",
    "backend/orchestrator/daemon.ts",
    "backend/agents/workforce/workflowCatalog.ts",
    "backend/agents/workforce/leaderboard.ts",
    "backend/agents/workforce/canaryPipeline.ts",
  ];
  const missing = docs.filter((f) => !existsSync(join(root, f)));
  steps.push({
    id: "docs_and_runtime_artifacts",
    required: true,
    ok: missing.length === 0,
    detail: missing.join(",") || "ok",
  });
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

{
  const daemon = existsSync(join(root, "backend/orchestrator/daemon.ts"));
  const compose = readFileSync(join(root, "backend/local-ai/docker-compose.yml"), "utf8");
  const hasProfile = compose.includes("orchestrator-daemon");
  steps.push({
    id: "block_c_daemon",
    required: true,
    ok: daemon && hasProfile,
    detail: daemon && hasProfile ? "daemon+compose_profile" : "missing",
  });
}

// Optional live probes — never convert skip into pass
{
  const ollama = process.env.NELVYON_WORKFORCE_LIVE_OLLAMA === "1";
  if (!ollama) {
    skipped.push({ id: "ollama_live", reason: "NELVYON_WORKFORCE_LIVE_OLLAMA!=1" });
  } else {
    const r = run("node", ["-e", "fetch(process.env.OLLAMA_HOST||'http://127.0.0.1:11434/api/tags').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]);
    steps.push({ id: "ollama_live", required: false, ok: r.status === 0 });
  }
}
{
  const oc = process.env.OPENCLAW_BRIDGE_URL?.trim();
  if (!oc) skipped.push({ id: "openclaw_live", reason: "OPENCLAW_BRIDGE_URL unset" });
  else skipped.push({ id: "openclaw_live", reason: "live probe deferred to dedicated openclaw suite" });
}
{
  skipped.push({ id: "production_build", reason: "expensive; run manually: pnpm -C apps/web build" });
  skipped.push({ id: "soak_load", reason: "use dedicated soak scripts; not part of default workforce gate" });
}

const requiredOk = steps.filter((s) => s.required).every((s) => s.ok);

// Honest blockers that keep certified=false even if tests green
const internalRemaining = [];
if (!existsSync(join(root, "docs/CURSOR_OPEN_SOURCE_INTEGRATION_AUDIT.md"))) {
  internalRemaining.push("cursor_oss_audit_doc");
}
// External / ops (do not invent PASS)
const externalBlockers = [
  "docker_pgvector_ops_residual_KI016",
  "migration_514_shared_memory_ops",
  "openclaw_authorized_url_optional",
  "ses_stripe_prod_ops",
];

if (!requiredOk) {
  blockers.push(...steps.filter((s) => s.required && !s.ok).map((s) => s.id));
}

let verdict = "FAIL";
let certified = false;
let rationale = "Required workforce gates failed.";

if (requiredOk) {
  // Full PASS only when no internal remaining work AND operator explicitly allows (evidence-complete).
  // Default: CONDITIONAL_PASS — external ops residuals + skipped live probes documented.
  const forcePass = process.env.NELVYON_WORKFORCE_FORCE_PASS === "1";
  if (forcePass) {
    // Still refuse force without requiredOk (already true) — and refuse if docs missing
    verdict = "FAIL";
    rationale = "NELVYON_WORKFORCE_FORCE_PASS is forbidden; cert must be earned.";
    blockers.push("force_pass_rejected");
  } else if (internalRemaining.length === 0) {
    verdict = "CONDITIONAL_PASS";
    certified = false;
    rationale =
      "Blocks C–G implemented with daemon recovery, promoted agents, workflows, leaderboard/canary, docs. External ops residuals remain; live Ollama/OpenClaw/soak skipped unless opted in. Not claiming world-class agents.";
    blockers.push(...externalBlockers);
  } else {
    verdict = "CONDITIONAL_PASS";
    certified = false;
    rationale = "Internal docs/runtime incomplete.";
    blockers.push(...internalRemaining);
  }
}

const report = {
  schema: "nelvyon.autonomous.workforce.cert.v1",
  generatedAt: new Date().toISOString(),
  commit: gitCommit(),
  environment: {
    node: process.version,
    platform: process.platform,
    model: process.env.NELVYON_LOCAL_MODEL || "sandbox_deterministic",
  },
  verdict,
  nelvyonAutonomousWorkforceCertified: certified,
  rationale,
  steps,
  skipped,
  blockers,
  metrics: {
    requiredSteps: steps.filter((s) => s.required).length,
    requiredPassed: steps.filter((s) => s.required && s.ok).length,
    skippedCount: skipped.length,
  },
  security: { criticalControls: "enforced_in_unit_tests", claim: "not_100pct_live_prod" },
  isolation: { tenant: "tested_in_eval_suite", claim: "sandbox_deterministic" },
  recovery: { restart: "workforceBlockC", deadLetter: "workforceBlockC", killSwitch: "workforceBlockB+C" },
  resources: { leaderboard: true, canary: true, daemon: true },
  notClaimed: [
    "NELVYON_AUTONOMOUS_WORKFORCE_CERTIFIED",
    "world_class_agents",
    "hundreds_of_permanent_agents",
    "100_percent_perfect",
  ],
};

const outPath = join(outDir, "workforce_certification.json");
writeFileSync(outPath, JSON.stringify(report, null, 2), "utf8");
console.log(JSON.stringify(report, null, 2));
console.log(`\nWrote ${outPath}`);
process.exit(requiredOk && verdict !== "FAIL" ? 0 : 1);
