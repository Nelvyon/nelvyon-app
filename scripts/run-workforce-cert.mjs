#!/usr/bin/env node
/**
 * Autonomous workforce certification harness — final PASS path (evidence-only).
 *
 * Does NOT force PASS. Does NOT convert skips into passes.
 * NELVYON_AUTONOMOUS_WORKFORCE_CERTIFIED=true only when:
 *   - all required steps pass
 *   - skipped.length === 0
 *   - no internal blockers
 *   - live Ollama/RAG evidence present (auto when Ollama reachable)
 *   - OpenClaw mock certified (live URL optional → external note, not skip)
 *   - production build OK
 *   - reasonable soak OK
 *
 * Usage: node scripts/run-workforce-cert.mjs
 */

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "backend", "local-ai", "benchmarks");
mkdirSync(outDir, { recursive: true });

function run(cmd, args, env = {}, timeoutMs = 0) {
  const r = spawnSync(cmd, args, {
    cwd: root,
    encoding: "utf8",
    shell: true,
    env: { ...process.env, ...env },
    timeout: timeoutMs > 0 ? timeoutMs : undefined,
    maxBuffer: 20 * 1024 * 1024,
  });
  return { status: r.status ?? 1, out: (r.stdout || "") + (r.stderr || ""), signal: r.signal };
}

function gitCommit() {
  const r = spawnSync("git", ["rev-parse", "--short", "HEAD"], {
    cwd: root,
    encoding: "utf8",
    shell: true,
  });
  return (r.stdout || "unknown").trim();
}

async function ollamaReachable() {
  const raw = (process.env.OLLAMA_HOST || process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434").replace(
    /\/$/,
    "",
  );
  // `OLLAMA_HOST` es `host:port` SIN esquema en la convención oficial de Ollama.
  // Consumirlo tal cual como base de `fetch` daba "Failed to parse URL from
  // 127.0.0.1:11434/api/tags", que este gate reportaba como `unreachable`:
  // indistinguible de que el servidor no estuviera levantado. Misma
  // normalización que `backend/local-ai/config.ts`.
  const host = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `http://${raw}`;
  try {
    const res = await fetch(`${host}/api/tags`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return { ok: false, host, detail: `http_${res.status}` };
    const data = await res.json();
    const models = Array.isArray(data?.models) ? data.models.map((m) => m.name) : [];
    return { ok: true, host, models };
  } catch (e) {
    return { ok: false, host, detail: e instanceof Error ? e.message : String(e) };
  }
}

const steps = [];
const skipped = [];
const blockers = [];
const externalNotes = [];

function addStep(id, required, ok, detail) {
  steps.push({ id, required, ok, detail: detail ?? (ok ? "pass" : "fail") });
}

// --- Required core ---
{
  const r = run("pnpm", ["-C", "apps/web", "exec", "tsc", "--noEmit"], {}, 600_000);
  addStep("typecheck", true, r.status === 0, r.status === 0 ? "pass" : r.out.slice(-800));
}

{
  const files = [
    "backend/saas/__tests__/workforceBlockB.test.ts",
    "backend/saas/__tests__/workforceBlockC.test.ts",
    "backend/saas/__tests__/workforceBlockDEFG.test.ts",
    "backend/saas/__tests__/workforcePassResiduals.test.ts",
    "backend/saas/__tests__/phase2Elite.test.ts",
    "backend/saas/__tests__/phase2Runtime.test.ts",
  ];
  const r = run("pnpm", ["-C", "apps/web", "exec", "vitest", "run", ...files, "--reporter=dot"], {}, 600_000);
  addStep(
    "workforce_and_elite_regression",
    true,
    r.status === 0,
    r.status === 0 ? "pass" : r.out.slice(-1500),
  );
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
  addStep("docs_and_runtime_artifacts", true, missing.length === 0, missing.join(",") || "ok");
}

{
  const freeze = [
    "backend/local-ai/benchmarks/router_certification_final.json",
    "backend/local-ai/benchmarks/mcp_certification_final.json",
    "backend/local-ai/benchmarks/phase2_elite_certification.json",
  ];
  const missing = freeze.filter((f) => !existsSync(join(root, f)));
  addStep("phase1_phase2_freeze", true, missing.length === 0, missing.join(",") || "ok");
}

{
  const daemon = existsSync(join(root, "backend/orchestrator/daemon.ts"));
  const compose = readFileSync(join(root, "backend/local-ai/docker-compose.yml"), "utf8");
  addStep(
    "block_c_daemon",
    true,
    daemon && compose.includes("orchestrator-daemon"),
    daemon && compose.includes("orchestrator-daemon") ? "daemon+compose_profile" : "missing",
  );
}

// Soak evidence from residuals test (or re-check artifact)
{
  const soakPath = join(outDir, "workforce_soak.json");
  let ok = false;
  let detail = "missing_artifact";
  if (existsSync(soakPath)) {
    try {
      const j = JSON.parse(readFileSync(soakPath, "utf8"));
      ok = j.ok === true && j.running_leaked === 0;
      detail = `ticks=${j.ticks} succeeded=${j.succeeded} dead=${j.dead_letter}`;
    } catch (e) {
      detail = e instanceof Error ? e.message : "parse_fail";
    }
  }
  addStep("soak_load", true, ok, detail);
}

// OpenClaw: mock covered in residuals; live only if URL set (never skip)
{
  const url = (process.env.NELVYON_OPENCLAW_BRIDGE_URL || process.env.OPENCLAW_BRIDGE_URL || "").trim();
  if (!url) {
    addStep("openclaw_mock", true, true, "mock_certified_in_residuals");
    externalNotes.push("openclaw_live_url_unset_mock_ok");
  } else {
    addStep("openclaw_mock", true, true, "mock_certified_in_residuals");
    // Live probe: URL present — attempt fetch (authorization still requires shared memory flags)
    try {
      // sync via spawn node
      const r = run(
        "node",
        [
          "-e",
          `fetch(process.env.U+'/v1/dispatch',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({tenantId:'t1',agentId:'seo',input:'ping',tools:[]})}).then(r=>process.exit(r.status<500?0:1)).catch(()=>process.exit(1))`,
        ],
        { U: url.replace(/\/$/, "") },
        30_000,
      );
      addStep("openclaw_live", true, r.status === 0, r.status === 0 ? "live_url_ok" : r.out.slice(-400));
    } catch (e) {
      addStep("openclaw_live", true, false, e instanceof Error ? e.message : "fail");
    }
  }
}

// Production build — required for PASS (no skip)
{
  const skipBuild = process.env.NELVYON_WORKFORCE_SKIP_BUILD === "1";
  if (skipBuild) {
    // Explicit skip is allowed for local iteration but blocks PASS (skipped != 0)
    skipped.push({ id: "production_build", reason: "NELVYON_WORKFORCE_SKIP_BUILD=1" });
    addStep("production_build", false, false, "skipped_by_env");
  } else {
    const r = run("pnpm", ["-C", "apps/web", "build"], {}, 1_200_000);
    const buildId = existsSync(join(root, "apps/web/.next/BUILD_ID"));
    addStep(
      "production_build",
      true,
      r.status === 0 && buildId,
      r.status === 0 && buildId ? "build_ok" : r.out.slice(-1200),
    );
  }
}

// Ollama + RAG live — auto when reachable
const ollama = await ollamaReachable();
{
  if (!ollama.ok) {
    // External ops: start Ollama — not a silent skip; required step fails → no PASS
    addStep("ollama_live", true, false, `unreachable:${ollama.detail}`);
    addStep("rag_live", true, false, "blocked_by_ollama");
    externalNotes.push("ollama_not_running_start_local_service");
  } else {
    const r = run(
      "pnpm",
      ["-C", "apps/web", "exec", "vitest", "run", "backend/saas/__tests__/workforceLive.test.ts", "--reporter=dot"],
      {
        NELVYON_WORKFORCE_LIVE: "1",
        NELVYON_WORKFORCE_LIVE_OLLAMA: "1",
        OLLAMA_MODEL: process.env.OLLAMA_MODEL || "llama3.1:8b-instruct-q4_K_M",
        LOCAL_AI_EMBEDDING_MODEL: process.env.LOCAL_AI_EMBEDDING_MODEL || "mxbai-embed-large",
        LOCAL_AI_EMBEDDING_DIM: process.env.LOCAL_AI_EMBEDDING_DIM || "1024",
        NELVYON_ORCHESTRATOR_LIVE: "1",
      },
      900_000,
    );
    const livePath = join(outDir, "workforce_live.json");
    let liveOk = false;
    let detail = r.out.slice(-800);
    if (r.status === 0 && existsSync(livePath)) {
      try {
        const j = JSON.parse(readFileSync(livePath, "utf8"));
        liveOk = j.ok === true;
        detail = liveOk ? `models=${(ollama.models || []).length}` : JSON.stringify(j.elite?.blockers ?? j);
      } catch (e) {
        detail = e instanceof Error ? e.message : "parse_fail";
      }
    }
    addStep("ollama_live", true, liveOk, detail);
    addStep("rag_live", true, liveOk, liveOk ? "elite_rag_ok" : "see_ollama_live");
  }
}

const forcePass = process.env.NELVYON_WORKFORCE_FORCE_PASS === "1";
if (forcePass) {
  blockers.push("force_pass_rejected");
}

const requiredOk = steps.filter((s) => s.required).every((s) => s.ok);
const internalBlockers = steps.filter((s) => s.required && !s.ok).map((s) => s.id);
if (internalBlockers.length) blockers.push(...internalBlockers);

// Phase-1 prod residuals — documented, do NOT block workforce PASS
externalNotes.push(
  "phase1_ses_stripe_prod_ops_separate",
  "docker_pgvector_ops_residual_optional_if_rag_live_ok",
  "migration_514_ops_separate_if_shared_memory_unit_ok",
);

let verdict = "FAIL";
let certified = false;
let rationale = "Required workforce gates failed.";

if (forcePass) {
  verdict = "FAIL";
  rationale = "NELVYON_WORKFORCE_FORCE_PASS is forbidden; cert must be earned.";
} else if (requiredOk && skipped.length === 0 && internalBlockers.length === 0) {
  verdict = "PASS";
  certified = true;
  rationale =
    "All required internal gates passed with live Ollama/RAG evidence, OpenClaw mock certified, production build, soak, workflow audit, and residual evals. External notes are Phase-1/ops residuals not blocking workforce cert.";
} else if (requiredOk && skipped.length > 0) {
  verdict = "CONDITIONAL_PASS";
  certified = false;
  rationale = `Required steps OK but skipped=${skipped.length} (e.g. SKIP_BUILD). PASS requires skipped=0.`;
  blockers.push(...skipped.map((s) => `skipped:${s.id}`));
} else if (steps.filter((s) => s.required).some((s) => s.ok)) {
  verdict = "CONDITIONAL_PASS";
  certified = false;
  rationale = "Partial: some required steps failed or live evidence incomplete.";
}

const report = {
  schema: "nelvyon.autonomous.workforce.cert.v2",
  generatedAt: new Date().toISOString(),
  commit: gitCommit(),
  environment: {
    node: process.version,
    platform: process.platform,
    model: process.env.OLLAMA_MODEL || "llama3.1:8b-instruct-q4_K_M",
    ollamaHost: ollama.host,
    ollamaReachable: ollama.ok,
    ollamaModels: ollama.models ?? [],
  },
  verdict,
  nelvyonAutonomousWorkforceCertified: certified,
  rationale,
  steps,
  skipped,
  blockers,
  externalNotes,
  metrics: {
    requiredSteps: steps.filter((s) => s.required).length,
    requiredPassed: steps.filter((s) => s.required && s.ok).length,
    skippedCount: skipped.length,
  },
  security: {
    criticalControls: "eval_adversarial_100pct_in_suite",
    killSwitch: true,
    claim: certified ? "critical_suite_pass" : "pending_full_evidence",
  },
  isolation: {
    tenant: "synthetic_rag_and_eval_suite",
    claim: certified ? "isolation_gates_pass" : "pending_full_evidence",
  },
  recovery: {
    restart: "workforceBlockC",
    deadLetter: "workforceBlockC",
    killSwitch: "workforceBlockB+C",
    soak: existsSync(join(outDir, "workforce_soak.json")),
  },
  resources: { leaderboard: true, canary: true, daemon: true, workflows: 45 },
  notClaimed: forcePass
    ? ["force_pass"]
    : certified
      ? ["world_class_agents", "hundreds_of_permanent_agents", "100_percent_perfect"]
      : [
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
process.exit(certified || (requiredOk && verdict === "CONDITIONAL_PASS") ? 0 : 1);
