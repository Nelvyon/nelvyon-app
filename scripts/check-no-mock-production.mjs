#!/usr/bin/env node
/**
 * Anti-mock gate — mock:// forbidden in production pack/autonomous publish paths.
 * Allowed: __tests__, smoke scripts (detectors), docs, examples, offline:// dry-run sim.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(import.meta.url), "..", "..");

const SCAN_DIRS = [
  "apps/web/src/lib/packs",
  "backend/autonomous/publish",
  "backend/autonomous/agents",
  "backend/autonomous/wrappers",
];

const ALLOW_SUFFIX = [
  "/__tests__/",
  "/examples/",
  ".example.json",
];

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const rel = relative(root, full).replace(/\\/g, "/");
    if (ALLOW_SUFFIX.some((s) => rel.includes(s))) continue;
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx|mjs)$/.test(name)) out.push(full);
  }
  return out;
}

const violations = [];
for (const dir of SCAN_DIRS) {
  const abs = join(root, dir);
  for (const file of walk(abs)) {
    const rel = relative(root, file).replace(/\\/g, "/");
    const text = readFileSync(file, "utf8");
    if (!text.includes("mock://")) continue;
    // Allow references that only detect/block mock (containsMockUrl, isLiveQaUrl, comments)
    const lines = text.split("\n");
    for (let i = 0; i < lines.length; i += 1) {
      if (!lines[i].includes("mock://")) continue;
      const line = lines[i].trim();
      if (
        line.includes('includes("mock://")') ||
        line.includes("startsWith(\"mock://\")") ||
        line.includes("mock:// —") ||
        line.startsWith("*") ||
        line.startsWith("//") ||
        line.startsWith("/**") ||
        line.includes("zero mock://") ||
        line.includes("never mock://")
      ) {
        continue;
      }
      violations.push(`${rel}:${i + 1}: ${line.slice(0, 120)}`);
    }
  }
}

if (violations.length > 0) {
  console.error("❌ anti-mock-production FAIL — mock:// in production paths:\n");
  for (const v of violations) console.error(`  ${v}`);
  process.exit(1);
}

console.log("✅ anti-mock-production: 0 mock:// literals in production pack/autonomous paths");
process.exit(0);
