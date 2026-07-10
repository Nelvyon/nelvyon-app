#!/usr/bin/env node
/**
 * Sync NEXT_PUBLIC_SENTRY_DSN from SENTRY_DSN on Railway @nelvyon/web (no stdout secrets).
 * Usage: railway service @nelvyon/web && node scripts/sync-railway-sentry-public.mjs
 */
import { execSync, spawnSync } from "node:child_process";

function railwayJson() {
  const out = execSync("railway variable list --json", {
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
    shell: process.platform === "win32",
  });
  return JSON.parse(out);
}

try {
  const vars = railwayJson();
  const dsn = vars.SENTRY_DSN?.trim();
  const existing = vars.NEXT_PUBLIC_SENTRY_DSN?.trim();

  if (!dsn) {
    console.log("SKIP: SENTRY_DSN not set on linked Railway service");
    process.exit(0);
  }
  if (existing) {
    console.log("OK: NEXT_PUBLIC_SENTRY_DSN already set");
    process.exit(0);
  }

  const r = spawnSync("railway", ["variable", "set", "NEXT_PUBLIC_SENTRY_DSN", "--stdin", "--skip-deploys"], {
    input: dsn,
    stdio: ["pipe", "inherit", "inherit"],
    shell: process.platform === "win32",
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
  console.log("OK: NEXT_PUBLIC_SENTRY_DSN synced from SENTRY_DSN");
} catch (err) {
  console.error("FAIL:", err instanceof Error ? err.message : String(err));
  process.exit(1);
}
