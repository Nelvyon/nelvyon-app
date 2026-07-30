#!/usr/bin/env node
/**
 * Credential-free Phase 2 validation: redirect defaults + OAuth/WA missing-key helpers.
 * Never prints secret values.
 *
 *   node scripts/validate-phase2-integrations.mjs
 */
import { spawnSync } from "node:child_process";
import { writeFileSync, unlinkSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const tmp = join(root, "scripts", "_validate-phase2-run.mts");
mkdirSync(dirname(tmp), { recursive: true });

writeFileSync(
  tmp,
  `import {
  defaultOAuthRedirectUri,
  missingGoogleOAuthEnvKeys,
  missingMetaOAuthEnvKeys,
  missingLinkedInOAuthEnvKeys,
  missingWhatsAppCloudEnvKeys,
} from "../backend/oauth/oauthEnv.ts";
import { missingSesEnvKeys, missingStripeEnvKeys, isTwilioEnvConfigured } from "../backend/saas/saasEnv.ts";

const redirects = {
  google: defaultOAuthRedirectUri("/api/oauth/google/callback"),
  meta: defaultOAuthRedirectUri("/api/oauth/meta/callback"),
  linkedin: defaultOAuthRedirectUri("/api/oauth/linkedin/callback"),
  tiktok: defaultOAuthRedirectUri("/api/oauth/tiktok/callback"),
  snapchat: defaultOAuthRedirectUri("/api/oauth/snapchat/callback"),
  saasHub: defaultOAuthRedirectUri("/api/saas/oauth/callback"),
  sesWebhook: defaultOAuthRedirectUri("/api/webhooks/ses"),
  stripeWebhook: defaultOAuthRedirectUri("/api/webhooks/stripe"),
  whatsappWebhook: defaultOAuthRedirectUri("/api/webhooks/whatsapp"),
};

const badHost = Object.entries(redirects).filter(([, u]) => !u.includes("://"));
const usesApexDefault = Object.entries(redirects).filter(([, u]) =>
  u.startsWith("https://nelvyon.com/") && !process.env.NEXT_PUBLIC_APP_URL && !process.env.NEXTAUTH_URL
);

const report = {
  ok: badHost.length === 0 && usesApexDefault.length === 0,
  redirects,
  missing: {
    googleOAuth: missingGoogleOAuthEnvKeys(),
    metaOAuth: missingMetaOAuthEnvKeys(),
    linkedinOAuth: missingLinkedInOAuthEnvKeys(),
    whatsappCloud: missingWhatsAppCloudEnvKeys(),
    ses: missingSesEnvKeys(),
    stripe: missingStripeEnvKeys(),
    twilioConfigured: isTwilioEnvConfigured(),
  },
  humanChecklists: [
    "docs/ops/PHASE2_EXTERNAL_INTEGRATIONS.md",
    "docs/ops/OAUTH_PROVIDER_APPS_CEO_CHECKLIST.md",
    "docs/ops/ADS_OAUTH_SPEND_CEO_CHECKLIST.md",
    "docs/ops/SOCIAL_PUBLISH_OAUTH_CEO_CHECKLIST.md",
    "docs/ops/TELEPHONY_PROVIDER_CEO_CHECKLIST.md",
    "docs/ops/WHATSAPP_CEO_CHECKLIST.md",
    "docs/OPS_STRIPE_PROD.md",
    "docs/OPS_SES_PROD.md",
  ],
  notes: [
    "missing.* arrays empty only means vars set in THIS shell — Railway secrets are human-loaded",
    "spend/publish/calls remain OFF until CEO checklists",
  ],
};
console.log(JSON.stringify(report, null, 2));
process.exit(report.ok ? 0 : 1);
`,
);

const r = spawnSync("pnpm", ["-C", "apps/web", "exec", "tsx", tmp], {
  cwd: root,
  encoding: "utf8",
  shell: true,
  env: process.env,
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
