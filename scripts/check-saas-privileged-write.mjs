#!/usr/bin/env node
/**
 * Fail if privileged SaaS mutation routes still require only settings.read.
 * Member/viewer have settings.read — mutations must use settings.write (owner).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("../apps/web/src/app/api/saas", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1");

const PRIVILEGED = [
  "api-keys/route.ts",
  "webhooks/route.ts",
  "team/route.ts",
  "store/settings/route.ts",
];

let failed = 0;

for (const rel of PRIVILEGED) {
  const full = join(ROOT, rel);
  const content = readFileSync(full, "utf8");
  // POST/PATCH/DELETE must not use settings.read
  const mutationBlocks = content.match(/export async function (POST|PATCH|DELETE)[\s\S]*?(?=export async function |\z)/g) ?? [];
  for (const block of mutationBlocks) {
    if (block.includes('requireSaasContext(req, "settings.read")') || block.includes("requireSaasContext(req, 'settings.read')")) {
      console.error(`❌ Privileged mutation still uses settings.read: /api/saas/${rel}`);
      failed++;
    }
    if (!block.includes("settings.write")) {
      console.error(`❌ Privileged mutation missing settings.write: /api/saas/${rel}`);
      failed++;
    }
  }
}

if (failed > 0) {
  console.error(`\n${failed} RBAC privilege issue(s). Use settings.write for mutations.`);
  process.exit(1);
}

console.log("✅ Privileged SaaS mutations require settings.write");
