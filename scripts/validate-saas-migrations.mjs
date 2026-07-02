#!/usr/bin/env node
/**
 * Validates SaaS migration files 401–490 exist (no gaps in elite range).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const dir = path.join(root, "backend/db/migrations");
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".sql"));

const nums = files
  .map((f) => {
    const m = /^(\d+)_/.exec(f);
    return m ? Number(m[1]) : null;
  })
  .filter((n) => n != null && n >= 401 && n <= 490)
  .sort((a, b) => a - b);

const expected = [];
for (let i = 401; i <= 490; i++) expected.push(i);

const present = new Set(nums);
const missing = expected.filter((n) => !files.some((f) => f.startsWith(`${String(n).padStart(3, "0")}_`)));

console.log(`[validate-saas-migrations] files in 401–490 range: ${nums.length}`);
if (missing.length > 0) {
  console.error(`[validate-saas-migrations] FAIL — missing migration numbers: ${missing.join(", ")}`);
  process.exit(1);
}

const dupes = nums.filter((n, i, arr) => arr.indexOf(n) !== i);
if (dupes.length) {
  console.error(`[validate-saas-migrations] FAIL — duplicate numbers: ${[...new Set(dupes)].join(", ")}`);
  process.exit(1);
}

console.log("[validate-saas-migrations] OK — elite migration range present");
void present;
