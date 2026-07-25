#!/usr/bin/env node
/**
 * SSOT entrypoint: `node scripts/staging-smoke-pgvector-rag-e2e.mjs`
 * Real logic lives in scripts/staging-smoke-pgvector-rag-e2e.ts (runs via tsx, same
 * convention as scripts/local-ai-health.mjs) — direct .ts execution avoids a fragile
 * separate compiled build for a one-shot smoke script.
 */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const tsEntry = join(root, "scripts", "staging-smoke-pgvector-rag-e2e.ts");

if (!existsSync(tsEntry)) {
  console.error("[staging-smoke-pgvector-rag-e2e] missing scripts/staging-smoke-pgvector-rag-e2e.ts");
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
