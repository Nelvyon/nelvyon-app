#!/usr/bin/env node
/**
 * Phase 2 Elite certification harness (repo-internal).
 * Does NOT mutate Router / MCP / Specialization freeze artifacts.
 *
 * Usage: node scripts/run-phase2-elite-cert.mjs
 */

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
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
  return {
    status: r.status ?? 1,
    stdout: r.stdout ?? "",
    stderr: r.stderr ?? "",
  };
}

const steps = [];

// 1) Typecheck
{
  const r = run("pnpm", ["-C", "apps/web", "exec", "tsc", "--noEmit"]);
  steps.push({ id: "typecheck", ok: r.status === 0, detail: r.status === 0 ? "0 errors" : r.stderr.slice(0, 500) });
}

// 2) Elite + Phase2 regression vitest
{
  const files = [
    "backend/saas/__tests__/phase2Elite.test.ts",
    "backend/saas/__tests__/phase2Runtime.test.ts",
    "backend/saas/__tests__/phase2Integration.test.ts",
    "backend/saas/__tests__/sharedMemoryContracts.test.ts",
    "backend/saas/__tests__/mcpProductive.test.ts",
  ];
  const r = run("pnpm", ["-C", "apps/web", "exec", "vitest", "run", ...files, "--reporter=dot"]);
  const ok = r.status === 0;
  steps.push({
    id: "vitest_elite_and_phase2",
    ok,
    detail: ok ? "pass" : (r.stdout + r.stderr).slice(-800),
  });
}

// 3) Freeze evidence presence (Phase 1 AI certs intact as files)
{
  const checks = [
    "backend/local-ai/benchmarks/router_certification_final.json",
    "backend/local-ai/benchmarks/mcp_certification_final.json",
  ];
  const missing = checks.filter((rel) => !existsSync(join(root, rel)));
  steps.push({
    id: "phase1_ai_freeze_artifacts",
    ok: missing.length === 0,
    detail: missing.length ? `missing: ${missing.join(", ")}` : "router+mcp cert files present",
  });
}

const allOk = steps.every((s) => s.ok);
const verdict = allOk ? "CONDITIONAL_PASS" : "FAIL";
// Elite full PASS requires live LLM agent thresholds + ops activation — not claimed here.
const report = {
  schema: "nelvyon.phase2.elite.cert.v1",
  generatedAt: new Date().toISOString(),
  verdict,
  phase2EliteCertified: false,
  rationale:
    verdict === "CONDITIONAL_PASS"
      ? "Repo gates green: sandbox workflows, agent eval suite, OpenClaw mock, memory security. Live multi-agent LLM E2E and production activation remain external/ops."
      : "One or more elite gates failed.",
  steps,
  notClaimed: [
    "PHASE2_ELITE_CERTIFIED",
    "world_class_agents",
    "production_ready_without_ops",
  ],
};

const outPath = join(outDir, "phase2_elite_certification.json");
writeFileSync(outPath, JSON.stringify(report, null, 2), "utf8");
console.log(JSON.stringify(report, null, 2));
console.log(`\nWrote ${outPath}`);
process.exit(allOk ? 0 : 1);
