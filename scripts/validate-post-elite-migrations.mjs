#!/usr/bin/env node
/**
 * Validates post-elite migrations 508–517 exist
 * (Phase 1 extension + Shared Memory + RLS + FastAPI RLS repair + workspaces columns).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const dir = path.join(root, "backend/db/migrations");
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".sql"));

const MIN = 508;
const MAX = 517;
const missing = [];

for (let n = MIN; n <= MAX; n += 1) {
  const prefix = String(n).padStart(3, "0");
  if (!files.some((f) => f.startsWith(`${prefix}_`))) {
    missing.push(n);
  }
}

if (missing.length > 0) {
  console.error(`[validate-post-elite-migrations] FAIL — missing: ${missing.join(", ")}`);
  process.exit(1);
}

console.log(`[validate-post-elite-migrations] OK — ${MIN}–${MAX} present`);
