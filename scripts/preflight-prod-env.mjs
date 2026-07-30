#!/usr/bin/env node
/**
 * Production env preflight — lists missing critical/warning keys (no secret values).
 *
 *   node scripts/preflight-prod-env.mjs
 */
import { writeFileSync, mkdirSync, unlinkSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
mkdirSync(join(root, "backend/local-ai/benchmarks"), { recursive: true });

const tmp = join(root, "scripts", "_preflight-prod-env-run.mts");
writeFileSync(
  tmp,
  `import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { validateProductionEnv } from "../backend/config/prodEnvValidation.ts";
import { missingStripeStoreWebhookSecret, missingStripeConnectWebhookSecret, missingSesEnvKeys, missingStripeEnvKeys, missingGoogleOAuthEnvKeys, missingMetaOAuthEnvKeys, missingLinkedInOAuthEnvKeys, missingWhatsAppCloudEnvKeys } from "../backend/saas/saasEnv.ts";
import { resolveOpenClawRuntimeConfig } from "../backend/openclaw/contracts.ts";

const root = ${JSON.stringify(root)};
const outPath = join(root, "backend/local-ai/benchmarks/prod_env_preflight.json");
mkdirSync(dirname(outPath), { recursive: true });

const base = validateProductionEnv();
const report = {
  generatedAt: new Date().toISOString(),
  ...base,
  integrations: {
    stripeCoreMissing: missingStripeEnvKeys(),
    stripeStoreMissing: missingStripeStoreWebhookSecret(),
    stripeConnectMissing: missingStripeConnectWebhookSecret(),
    sesMissing: missingSesEnvKeys(),
    googleOAuthMissing: missingGoogleOAuthEnvKeys(),
    metaOAuthMissing: missingMetaOAuthEnvKeys(),
    linkedinOAuthMissing: missingLinkedInOAuthEnvKeys(),
    whatsappCloudMissing: missingWhatsAppCloudEnvKeys(),
    openClaw: resolveOpenClawRuntimeConfig(),
  },
  humanChecklists: [
    "docs/ops/PHASE2_EXTERNAL_INTEGRATIONS.md",
    "docs/OPS_STRIPE_PROD.md",
    "docs/OPS_SES_PROD.md",
    "docs/ops/OAUTH_PROVIDER_APPS_CEO_CHECKLIST.md",
    "docs/ops/ADS_OAUTH_SPEND_CEO_CHECKLIST.md",
    "docs/ops/SOCIAL_PUBLISH_OAUTH_CEO_CHECKLIST.md",
    "docs/ops/TELEPHONY_PROVIDER_CEO_CHECKLIST.md",
    "docs/ops/WHATSAPP_CEO_CHECKLIST.md",
    "docs/OPS_SHARED_MEMORY_514.md",
  ],
};
writeFileSync(outPath, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
process.exit(report.ok ? 0 : 1);
`,
);

const r = spawnSync("pnpm", ["-C", "apps/web", "exec", "tsx", tmp], {
  cwd: root,
  encoding: "utf8",
  shell: true,
});
console.log(r.stdout || "");
if (r.status !== 0) console.error(r.stderr || "");
if (existsSync(tmp)) {
  try {
    unlinkSync(tmp);
  } catch {
    /* ignore */
  }
}
process.exit(r.status ?? 1);
