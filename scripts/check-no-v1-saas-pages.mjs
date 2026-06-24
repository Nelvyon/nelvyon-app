#!/usr/bin/env node
/**
 * CI gate: no /saas/* page should fetch from /api/v1/* routes.
 * These are legacy FastAPI routes that are being replaced by /api/saas/* (Next.js BFF).
 * Run: node scripts/check-no-v1-saas-pages.mjs
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __dir = fileURLToPath(new URL(".", import.meta.url));
const ROOT = join(__dir, "..");
const SAAS_PAGES_DIR = join(ROOT, "apps/web/src/app/saas");
// Only flag actual fetch/axios calls — not display strings or comments
const V1_PATTERN = /(?:fetch|axios(?:\.\w+)?)\s*\(\s*["'`]\/api\/v1\//;
// All pages migrated in S13 — zero exceptions allowed.
const SKIP_PAGES = [];

function walk(dir) {
  const entries = [];
  try {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) entries.push(...walk(full));
      else if (name.endsWith(".tsx") || name.endsWith(".ts")) entries.push(full);
    }
  } catch { /* skip unreadable */ }
  return entries;
}

const files = walk(SAAS_PAGES_DIR);
const violations = [];

for (const file of files) {
  const rel = relative(ROOT, file).replace(/\\/g, "/");
  // Skip coming_soon pages — they are flagged by CLAUDE.md, not this script
  const segment = rel.split("/").find((s) => SKIP_PAGES.some((skip) => s.startsWith(skip)));
  if (segment) continue;

  const content = readFileSync(file, "utf8");
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Skip comment lines
    if (line.trimStart().startsWith("//") || line.trimStart().startsWith("*")) continue;
    if (V1_PATTERN.test(line)) {
      violations.push({ file: rel, line: i + 1, text: line.trim() });
    }
  }
}

if (violations.length === 0) {
  console.log("✅ No /api/v1/* references found in /saas/* pages.");
  process.exit(0);
} else {
  console.error(`❌ Found ${violations.length} /api/v1/* reference(s) in /saas/* pages:\n`);
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line}  ${v.text}`);
  }
  console.error("\nFix: replace /api/v1/* with the corresponding /api/saas/* route.");
  process.exit(1);
}
