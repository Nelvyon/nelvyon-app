#!/usr/bin/env node
/**
 * Local elite reinforcement — no staging required.
 * Runs all blocking code-quality gates before deploy.
 *
 * Usage: node scripts/run-local-elite-reinforce.mjs
 */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function run(label, cmd, args, opts = {}) {
  console.log(`\n========== ${label} ==========\n`);
  const useShell = opts.shell ?? (process.platform === "win32" && cmd === "pnpm");
  const r = spawnSync(cmd, args, {
    cwd: opts.cwd ?? root,
    stdio: "inherit",
    shell: useShell,
    env: { ...process.env, NODE_OPTIONS: process.env.NODE_OPTIONS ?? "--max-old-space-size=8192" },
  });
  const ok = (r.status ?? 1) === 0;
  console.log(ok ? `\n${label}_PASS\n` : `\n${label}_FAIL\n`);
  return ok;
}

const steps = [
  {
    label: "anti-mock-production",
    run: () =>
      run("anti-mock-production", process.execPath, [
        join(root, "scripts/check-no-mock-production.mjs"),
      ]),
  },
  {
    label: "anti-stub",
    run: () => run("anti-stub", process.execPath, [join(root, "scripts/check-saas-stubs.mjs")]),
  },
  {
    label: "anti-v1",
    run: () => run("anti-v1", process.execPath, [join(root, "scripts/check-no-v1-saas-pages.mjs")]),
  },
  {
    label: "migrations",
    run: () => run("migrations", process.execPath, [join(root, "scripts/validate-saas-migrations.mjs")]),
  },
  {
    label: "os-pack-gate",
    run: () => run("os-pack-gate", process.execPath, [join(root, "scripts/run-os-pack-gate.mjs")]),
  },
  {
    label: "typecheck",
    run: () => run("typecheck", "pnpm", ["-C", "apps/web", "exec", "tsc", "--noEmit"]),
  },
  {
    label: "eslint",
    run: () => run("eslint", "pnpm", ["-C", "apps/web", "exec", "eslint", "src", "--max-warnings", "0"]),
  },
  {
    label: "agent-tests",
    run: () =>
      run("agent-tests", "pnpm", [
        "-C",
        "apps/web",
        "exec",
        "vitest",
        "run",
        "../../backend/saas/__tests__/SaasInboxAgentService.test.ts",
        "../../backend/saas/__tests__/nelvyonAgentMockReplies.test.ts",
        "../../backend/saas/__tests__/SaasVoiceLlmParser.test.ts",
        "--reporter=dot",
      ]),
  },
  {
    label: "pack-tests",
    run: () =>
      run("pack-tests", "pnpm", [
        "-C",
        "apps/web",
        "exec",
        "vitest",
        "run",
        "src/lib/packs/__tests__",
        "../../backend/autonomous/__tests__/runAutonomousSimulation.test.ts",
        "../../backend/autonomous/__tests__/productionDeliverables.test.ts",
        "src/lib/packs/__tests__/genericProductionDeliverable.test.ts",
        "--reporter=dot",
      ]),
  },
];

let failed = false;
for (const step of steps) {
  if (!step.run()) {
    failed = true;
    break;
  }
}

if (failed) {
  console.log("LOCAL_ELITE_REINFORCE_FAIL");
  process.exit(1);
}
console.log("ALL_LOCAL_ELITE_REINFORCE_PASS");
process.exit(0);
