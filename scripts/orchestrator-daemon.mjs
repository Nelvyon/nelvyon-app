#!/usr/bin/env node
/**
 * Standalone orchestrator daemon (no Cursor required).
 *
 *   NELVYON_ORCHESTRATOR_ENABLED=1
 *   NELVYON_ORCH_PERSIST_DIR=./.nelvyon/orch
 *   NELVYON_ORCH_HEALTH_DIR=./.nelvyon/orch
 *   node scripts/orchestrator-daemon.mjs
 *
 * Uses dynamic import of compiled-ts via vitest/tsx path — runs through pnpm exec tsx if available.
 */

import { spawnSync, spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const persist = process.env.NELVYON_ORCH_PERSIST_DIR || join(root, ".nelvyon", "orch");
const health = process.env.NELVYON_ORCH_HEALTH_DIR || persist;
mkdirSync(persist, { recursive: true });

process.env.NELVYON_ORCHESTRATOR_ENABLED = process.env.NELVYON_ORCHESTRATOR_ENABLED || "1";
process.env.NELVYON_ORCH_PERSIST_DIR = persist;
process.env.NELVYON_ORCH_HEALTH_DIR = health;
process.env.NELVYON_ORCHESTRATOR_DAEMON = "1";

const runner = join(root, "scripts", "orchestrator-daemon-run.mts");
writeFileSync(
  runner,
  `
import { InMemoryAgentOrchestrator } from "../backend/orchestrator/runtime.ts";
import { OrchestratorDaemon } from "../backend/orchestrator/daemon.ts";

const orch = new InMemoryAgentOrchestrator(undefined, { persistDir: process.env.NELVYON_ORCH_PERSIST_DIR! });
const daemon = new OrchestratorDaemon(orch, {
  healthDir: process.env.NELVYON_ORCH_HEALTH_DIR!,
  pollIntervalMs: Number(process.env.NELVYON_ORCH_POLL_MS ?? 2000),
});
daemon.start();
console.log(JSON.stringify({ ok: true, workerId: daemon.workerId, persist: process.env.NELVYON_ORCH_PERSIST_DIR }));
const shutdown = async () => {
  await daemon.stop();
  process.exit(0);
};
process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());
`,
  "utf8",
);

// Prefer tsx; fallback to vitest node loader is heavy — try pnpm exec tsx
const tryTsx = spawnSync("pnpm", ["exec", "tsx", runner], {
  cwd: root,
  encoding: "utf8",
  shell: true,
  env: process.env,
});
if (tryTsx.status === 0 || tryTsx.signal) {
  process.exit(tryTsx.status ?? 0);
}

// Long-running: spawn detached-friendly
const child = spawn("pnpm", ["exec", "tsx", runner], {
  cwd: root,
  shell: true,
  env: process.env,
  stdio: "inherit",
});
child.on("exit", (code) => process.exit(code ?? 1));
