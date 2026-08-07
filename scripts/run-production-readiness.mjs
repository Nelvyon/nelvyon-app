#!/usr/bin/env node
/**
 * Aggregate production readiness (in-repo + env presence). No secrets printed.
 * Writes docs/evidence/os-saas-e2e/production_readiness_latest.json
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "docs", "evidence", "os-saas-e2e");

// Pure env presence checks (no secrets printed).
function has(k) {
  return Boolean(process.env[k]?.trim());
}
function hasAny(keys) {
  return keys.some((k) => has(k));
}

const checks = [];
function add(id, ok, detail = {}) {
  checks.push({ id, ok, ...detail });
}

add("env.jwt_secret", has("JWT_SECRET") && (process.env.JWT_SECRET?.length ?? 0) >= 32);
add("env.database_url", has("DATABASE_URL"));
add("env.cron_secret", has("CRON_SECRET"));
add(
  "env.ses",
  (has("SES_ACCESS_KEY_ID") || has("AWS_SES_ACCESS_KEY")) &&
    (has("SES_SECRET_ACCESS_KEY") || has("AWS_SES_SECRET_KEY")) &&
    has("SES_FROM_EMAIL"),
  { note: "KI-014 production access still external if sandbox" },
);
add(
  "env.stripe",
  (has("STRIPE_SECRET_KEY") || has("STRIPE_API_KEY")) &&
    has("STRIPE_WEBHOOK_SECRET") &&
    has("STRIPE_PRICE_ID_STARTER") &&
    has("STRIPE_PRICE_ID_PRO") &&
    has("STRIPE_PRICE_ID_AGENCY"),
);
add(
  "env.openai_or_ollama",
  Boolean(
    has("OPENAI_API_KEY") ||
      process.env.OLLAMA_CONFIGURED?.trim() === "1" ||
      hasAny(["OLLAMA_HOST", "OLLAMA_BASE_URL", "NELVYON_LOCAL_AI_URL", "LOCAL_AI_BASE_URL"]),
  ),
);
add("env.staging", has("STAGING_BASE_URL") || has("STAGING_E2E_EMAIL"));
add("artifact.global_cert", fs.existsSync(path.join(OUT, "global_certification_latest.json")));
add("artifact.restore_drill", fs.existsSync(path.join(OUT, "postgres_restore_drill_latest.json")));
add("artifact.live_multitenant", fs.existsSync(path.join(OUT, "live_multitenant_latest.json")));

let globalPass = false;
let restorePass = false;
try {
  globalPass = JSON.parse(fs.readFileSync(path.join(OUT, "global_certification_latest.json"), "utf8")).decision === "PASS";
} catch {
  /* */
}
try {
  restorePass = JSON.parse(fs.readFileSync(path.join(OUT, "postgres_restore_drill_latest.json"), "utf8")).decision === "PASS";
} catch {
  /* */
}
add("gate.global_cert_pass", globalPass);
add("gate.restore_drill_pass", restorePass);

const externalBlockers = [];
const sesOk = checks.find((c) => c.id === "env.ses")?.ok;
if (!sesOk) {
  externalBlockers.push("SES: faltan claves env (SES_FROM_EMAIL + access/secret o aliases AWS_SES_*)");
}
// KI-014 remains external even when keys exist — sandbox/production access is AWS-side.
externalBlockers.push(
  "SES KI-014: ProductionAccessEnabled debe ser true en AWS (sandbox/DENIED bloquea campañas reales)",
);
if (!checks.find((c) => c.id === "env.stripe")?.ok) {
  externalBlockers.push(
    "Stripe: faltan STRIPE_SECRET_KEY|STRIPE_API_KEY + WEBHOOK_SECRET + PRICE_ID_STARTER/PRO/AGENCY",
  );
}
if (!checks.find((c) => c.id === "env.staging")?.ok) {
  externalBlockers.push("OS packs E2E: STAGING_BASE_URL / STAGING_E2E_EMAIL no configurados");
}
if (!checks.find((c) => c.id === "env.openai_or_ollama")?.ok) {
  externalBlockers.push(
    "OS packs autónomos: OLLAMA_CONFIGURED=1 (o OLLAMA_HOST/BASE_URL) preferido; OPENAI_API_KEY opcional (requerido si AUTONOMOUS_PRODUCTION=true sin Ollama)",
  );
}

const internalReady =
  checks.find((c) => c.id === "gate.global_cert_pass")?.ok &&
  checks.find((c) => c.id === "gate.restore_drill_pass")?.ok &&
  checks.find((c) => c.id === "artifact.live_multitenant")?.ok;

const decision = internalReady && externalBlockers.length === 0 ? "PRODUCTION_READY" : "NOT_PRODUCTION_READY";

const summary = {
  tag: "production_readiness",
  timestamp: new Date().toISOString(),
  decision,
  internalReady: Boolean(internalReady),
  externalBlockers,
  checks,
  hash: createHash("sha256").update(JSON.stringify(checks)).digest("hex").slice(0, 16),
};

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, "production_readiness_latest.json"), JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
process.exit(decision === "PRODUCTION_READY" ? 0 : 2);
