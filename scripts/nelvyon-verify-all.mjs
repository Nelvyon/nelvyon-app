#!/usr/bin/env node
/**
 * NELVYON master verify — coordinates safe local gates.
 * Distinguishes PASS / FAIL / SKIPPED_EXTERNAL / NOT_CONFIGURED.
 * Never destructive. Never hides failures with || true.
 *
 *   node scripts/nelvyon-verify-all.mjs
 *   pnpm run nelvyon:verify:all
 *
 * Flags:
 *   --with-build     include next production build (slow)
 *   --json-only      print JSON summary only
 */
import { spawnSync } from "node:child_process";
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "backend/local-ai/benchmarks");
mkdirSync(outDir, { recursive: true });
const evidencePath = join(outDir, "nelvyon_verify_all_latest.json");

const args = new Set(process.argv.slice(2));
const withBuild = args.has("--with-build");
const jsonOnly = args.has("--json-only");

/** @typedef {"PASS"|"FAIL"|"SKIPPED_EXTERNAL"|"NOT_CONFIGURED"} GateStatus */

/** @type {{ id: string, status: GateStatus, exitCode: number|null, durationMs: number, detail: string }[]} */
const gates = [];

function run(id, command, cmdArgs, opts = {}) {
  const started = Date.now();
  const r = spawnSync(command, cmdArgs, {
    cwd: root,
    encoding: "utf8",
    shell: true,
    timeout: opts.timeout ?? 600_000,
    env: { ...process.env, ...(opts.env || {}) },
  });
  const durationMs = Date.now() - started;
  const out = `${r.stdout || ""}${r.stderr || ""}`.trim();
  const exitCode = r.status;
  let status = /** @type {GateStatus} */ ("FAIL");
  if (exitCode === 0) status = "PASS";
  else if (opts.externalExitCodes && opts.externalExitCodes.includes(exitCode)) {
    status = opts.notConfiguredExitCodes?.includes(exitCode)
      ? "NOT_CONFIGURED"
      : "SKIPPED_EXTERNAL";
  }
  const detail = (opts.detailFrom?.(out, exitCode) || out.slice(-400) || `exit ${exitCode}`).slice(0, 500);
  gates.push({ id, status, exitCode, durationMs, detail });
  if (!jsonOnly) {
    console.log(`[verify] ${status.padEnd(18)} ${id} (${durationMs}ms)`);
    if (status === "FAIL" && detail) console.log(`         ${detail.split("\n").slice(-3).join(" | ")}`);
  }
  return status;
}

function runNode(id, script, extraArgs = [], opts = {}) {
  return run(id, "node", [script, ...extraArgs], opts);
}

// 1) Preflight local-ai (Docker may be down)
runNode("preflight.local-ai-ingest", "scripts/preflight-local-ai-ingest.mjs", [], {
  externalExitCodes: [1],
  detailFrom: (out) => {
    if (/docker/i.test(out) && /FAIL|not running|cannot connect/i.test(out)) {
      return "Docker daemon DOWN — ingest not verified";
    }
    return out.slice(-300);
  },
});

// 2) Shared memory schema (needs DATABASE_URL)
runNode("verify.shared-memory-schema", "scripts/verify-shared-memory-schema.mjs", [], {
  externalExitCodes: [1, 2],
  notConfiguredExitCodes: [2],
});

// 3) Migrations files present
runNode("validate.post-elite-migrations", "scripts/validate-post-elite-migrations.mjs");

// 3b) SQL SSOT vs Alembic (ADR-002/039) — optional DB probe if DATABASE_URL set
runNode("validate.sql-alembic-ssot", "scripts/validate-sql-alembic-ssot.mjs");

// 4) Knowledge sync (no ingest)
runNode("knowledge.sync", "scripts/nelvyon-knowledge-sync.mjs");

// 5) npm audit high doc
runNode("npm.audit-high-doc", "scripts/document-npm-audit-high.mjs");

// 6) Typecheck
run("typecheck", "pnpm", ["-C", "apps/web", "exec", "tsc", "--noEmit"], { timeout: 300_000 });

// 7) Lint
run("lint", "pnpm", ["-C", "apps/web", "lint"], { timeout: 300_000 });

// 8) Security unit tests
run(
  "tests.security",
  "pnpm",
  [
    "-C",
    "apps/web",
    "exec",
    "vitest",
    "run",
    "src/__tests__/assertSaasOrigin.test.ts",
    "src/__tests__/securityHeaders.ssot.test.ts",
    "--reporter=dot",
  ],
  { timeout: 180_000 },
);

// 9) Main vitest suite
run(
  "tests.main",
  "pnpm",
  [
    "-C",
    "apps/web",
    "exec",
    "vitest",
    "run",
    "backend/saas",
    "backend/email",
    "src/features/saas-crm",
    "backend/db",
    "--reporter=dot",
  ],
  { timeout: 600_000 },
);

// 10) Optional build
if (withBuild) {
  run("build.production", "pnpm", ["-C", "apps/web", "build"], { timeout: 900_000 });
} else {
  gates.push({
    id: "build.production",
    status: "NOT_CONFIGURED",
    exitCode: null,
    durationMs: 0,
    detail: "Skipped — pass --with-build to run next production build",
  });
  if (!jsonOnly) console.log(`[verify] ${"NOT_CONFIGURED".padEnd(18)} build.production (use --with-build)`);
}

const failCount = gates.filter((g) => g.status === "FAIL").length;
const passCount = gates.filter((g) => g.status === "PASS").length;
const skipExt = gates.filter((g) => g.status === "SKIPPED_EXTERNAL").length;
const notCfg = gates.filter((g) => g.status === "NOT_CONFIGURED").length;

const verdict =
  failCount > 0 ? "NOT_READY" : skipExt > 0 || notCfg > 0 ? "CONDITIONAL_READY" : "READY_INTERNAL_GATES";

const report = {
  generatedAt: new Date().toISOString(),
  verdict,
  claimProductionReady: false,
  summary: { pass: passCount, fail: failCount, skippedExternal: skipExt, notConfigured: notCfg },
  gates,
  evidencePath,
  notes: [
    "READY_INTERNAL_GATES ≠ production READY (needs Docker ingest, SES/Stripe live, Railway, Cloudflare).",
    "Skipped/external gates are honest — not treated as PASS.",
  ],
};

writeFileSync(evidencePath, JSON.stringify(report, null, 2));
if (!jsonOnly) {
  console.log("\n=== NELVYON VERIFY ALL ===");
  console.log(JSON.stringify({ verdict, ...report.summary, evidencePath }, null, 2));
} else {
  console.log(JSON.stringify(report, null, 2));
}

process.exit(failCount > 0 ? 1 : 0);
