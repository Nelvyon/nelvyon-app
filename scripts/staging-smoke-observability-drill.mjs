#!/usr/bin/env node
/**
 * SSOT entrypoint: `node scripts/staging-smoke-observability-drill.mjs`
 * Real drill lives in scripts/staging-smoke-observability-drill.ts (tsx).
 * Local/free OpsObservabilityCore only — no paid APM.
 */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const tsEntry = join(root, "scripts", "staging-smoke-observability-drill.ts");

if (!existsSync(tsEntry)) {
  console.error("[staging-smoke-observability-drill] missing scripts/staging-smoke-observability-drill.ts");
  process.exit(1);
}

const isWin = process.platform === "win32";
const r = spawnSync(isWin ? "pnpm.cmd" : "pnpm", ["-C", "apps/web", "exec", "tsx", tsEntry], {
  cwd: root,
  encoding: "utf8",
  shell: isWin,
  stdio: "inherit",
  env: process.env,
});
process.exit(r.status ?? 1);
