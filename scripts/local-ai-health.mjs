#!/usr/bin/env node
/**
 * Local-AI health check — always runs TypeScript via tsx (no fragile .ts imports from .mjs).
 * SSOT implementation: scripts/local-ai-health.ts
 */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const tsEntry = join(root, "scripts", "local-ai-health.ts");

if (!existsSync(tsEntry)) {
  console.error("[local-ai-health] missing scripts/local-ai-health.ts");
  process.exit(1);
}

const r = spawnSync(
  "pnpm",
  ["-C", "apps/web", "exec", "tsx", tsEntry],
  { cwd: root, encoding: "utf8", shell: true, stdio: "inherit" },
);
process.exit(r.status ?? 1);
