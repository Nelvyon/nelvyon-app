#!/usr/bin/env node
/**
 * Validates GitHub Actions secret/variable references against docs/PRODUCTION_SECRETS.md.
 * No network, no secret values — name-level consistency only.
 */
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const workflowsDir = path.join(root, ".github", "workflows");

const doc = readFileSync(path.join(root, "docs", "PRODUCTION_SECRETS.md"), "utf8");

const referenced = new Set();
for (const file of readdirSync(workflowsDir).filter((f) => f.endsWith(".yml") || f.endsWith(".yaml"))) {
  const content = readFileSync(path.join(workflowsDir, file), "utf8");
  for (const m of content.matchAll(/secrets\.([A-Z0-9_]+)/g)) referenced.add(m[1]);
  for (const m of content.matchAll(/vars\.([A-Z0-9_]+)/g)) referenced.add(m[1]);
}

/** Documented in PRODUCTION_SECRETS or optional CI-only */
const allowed = new Set([
  "GITHUB_TOKEN", // actions default
  "CRON_SECRET",
  "DATABASE_URL",
  "DATABASE_PUBLIC_URL",
  "JWT_SECRET",
  "NPM_TOKEN",
  "STAGING_BASE_URL",
  "PRODUCTION_BASE_URL",
]);

const undocumented = [...referenced].filter((k) => !allowed.has(k) && !doc.includes(k));
if (undocumented.length > 0) {
  console.error("SECRETS_INVENTORY_FAIL: workflow refs not documented:", undocumented.join(", "));
  process.exit(1);
}
console.log("SECRETS_INVENTORY_PASS:", [...referenced].sort().join(", "));
