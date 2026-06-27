#!/usr/bin/env node
/**
 * O22 — Blocking OS pack gate (local, no staging required).
 *
 * Validates all 8 pack fixtures + the OS QA vitest suite. This is the BLOCKING
 * gate run in CI (.github/workflows/os-pack-gate.yml). It does NOT need
 * DATABASE_URL or STAGING_BASE_URL — it runs the vitest suites that assert:
 *   - packCertification.o17.test.ts : all 8 PACK_FIXTURES validate against RUNNERS
 *   - visualQaEngine.test.ts        : QA scoring engine
 *   - OsVisualQaGateService.o18.test.ts : QA gate thresholds
 *   - OsPackGateService.o22.test.ts : gate orchestration
 *
 * Usage:
 *   node scripts/run-os-pack-gate.mjs [--run-key $GITHUB_SHA]
 *
 * Exit 0 → ALL_GATE_PASS (safe to merge). Exit 1 → GATE_FAIL.
 */
import { spawnSync } from "node:child_process";

const args = process.argv.slice(2);
const runKeyIdx = args.indexOf("--run-key");
const runKey = runKeyIdx >= 0 ? args[runKeyIdx + 1] : `local-${new Date().toISOString()}`;

const GATE_TEST_FILES = [
  "apps/web/src/lib/packs/__tests__/packCertification.o17.test.ts",
  "backend/autonomous/__tests__/visualQaEngine.test.ts",
  "backend/autonomous/__tests__/OsVisualQaGateService.o18.test.ts",
  "backend/saas/__tests__/OsPackGateService.o22.test.ts",
];

console.log(`\n🚦 OS Pack Gate — run_key=${runKey}`);
console.log(`   Validating 8 pack fixtures + OS QA suite (${GATE_TEST_FILES.length} files)\n`);

const res = spawnSync(
  "pnpm",
  ["-C", "apps/web", "exec", "vitest", "run", ...GATE_TEST_FILES, "--reporter=dot"],
  { stdio: "inherit", shell: process.platform === "win32" },
);

if (res.status === 0) {
  console.log("\n✅ ALL_GATE_PASS — 8/8 pack fixtures valid + QA suite green");
  process.exit(0);
} else {
  console.error("\n❌ GATE_FAIL — pack fixtures or QA suite failed. Do NOT merge.");
  console.error("   Re-certify a pack: POST /api/os/packs/certifications/run { packId }");
  console.error("   Runbook: docs/OS_GATE_RUNBOOK.md");
  process.exit(1);
}
