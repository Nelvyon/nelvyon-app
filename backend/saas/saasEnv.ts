/** Shared env readiness checks for SaaS platform connectors. */

const TWILIO_KEYS = ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_FROM_NUMBER"] as const;
const STRIPE_PRICE_KEYS = ["STRIPE_PRICE_ID_STARTER", "STRIPE_PRICE_ID_PRO", "STRIPE_PRICE_ID_AGENCY"] as const;
const OPENAI_KEYS = ["OPENAI_API_KEY"] as const;

export function isEnvKeysConfigured(keys: readonly string[]): boolean {
  return keys.every((k) => Boolean(process.env[k]?.trim()));
}

/** True when any of the candidate env keys is set (non-empty). */
export function isAnyEnvKeyConfigured(keys: readonly string[]): boolean {
  return keys.some((k) => Boolean(process.env[k]?.trim()));
}

/**
 * SES keys — aligned with `backend/email/sesClient.ts` aliases.
 * Region defaults to eu-west-1 in the client; not required for "configured".
 */
export function isSesEnvConfigured(): boolean {
  const access =
    process.env.SES_ACCESS_KEY_ID?.trim() || process.env.AWS_SES_ACCESS_KEY?.trim();
  const secret =
    process.env.SES_SECRET_ACCESS_KEY?.trim() || process.env.AWS_SES_SECRET_KEY?.trim();
  const from = process.env.SES_FROM_EMAIL?.trim();
  return Boolean(access && secret && from);
}

export function isTwilioEnvConfigured(): boolean {
  return isEnvKeysConfigured(TWILIO_KEYS);
}

/**
 * Stripe secret accepts STRIPE_API_KEY alias (same as checkout / affiliate).
 * Still requires webhook secret + the three plan price IDs.
 */
export function isStripeEnvConfigured(): boolean {
  const secret =
    process.env.STRIPE_SECRET_KEY?.trim() || process.env.STRIPE_API_KEY?.trim();
  const webhook = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  return Boolean(secret && webhook) && isEnvKeysConfigured(STRIPE_PRICE_KEYS);
}

export function isOpenAiEnvConfigured(): boolean {
  return isEnvKeysConfigured(OPENAI_KEYS);
}

/**
 * Real spend gate for SaaS OpenAI usage (ADR-034 pattern). Having the API key
 * configured is NOT enough — spend requires explicit opt-in via
 * `AUTONOMOUS_ALLOW_OPENAI=1`. OFF by default in every environment, including prod.
 */
export function isOpenAiSpendAllowed(): boolean {
  return process.env.AUTONOMOUS_ALLOW_OPENAI?.trim() === "1" && isOpenAiEnvConfigured();
}

/** LLM path usable for OS packs (local Ollama primary, OpenAI optional). */
export function isPackLlmEnvConfigured(): boolean {
  if (process.env.OLLAMA_CONFIGURED?.trim() === "1") return true;
  if (
    isAnyEnvKeyConfigured([
      "OLLAMA_HOST",
      "OLLAMA_BASE_URL",
      "NELVYON_LOCAL_AI_URL",
      "LOCAL_AI_BASE_URL",
    ])
  ) {
    return true;
  }
  return isOpenAiEnvConfigured();
}

export function missingEnvKeys(keys: readonly string[]): string[] {
  return keys.filter((k) => !process.env[k]?.trim());
}

export function missingSesEnvKeys(): string[] {
  const missing: string[] = [];
  if (!process.env.SES_ACCESS_KEY_ID?.trim() && !process.env.AWS_SES_ACCESS_KEY?.trim()) {
    missing.push("SES_ACCESS_KEY_ID|AWS_SES_ACCESS_KEY");
  }
  if (!process.env.SES_SECRET_ACCESS_KEY?.trim() && !process.env.AWS_SES_SECRET_KEY?.trim()) {
    missing.push("SES_SECRET_ACCESS_KEY|AWS_SES_SECRET_KEY");
  }
  if (!process.env.SES_FROM_EMAIL?.trim()) missing.push("SES_FROM_EMAIL");
  return missing;
}

export function missingStripeEnvKeys(): string[] {
  const missing: string[] = [];
  if (!process.env.STRIPE_SECRET_KEY?.trim() && !process.env.STRIPE_API_KEY?.trim()) {
    missing.push("STRIPE_SECRET_KEY|STRIPE_API_KEY");
  }
  if (!process.env.STRIPE_WEBHOOK_SECRET?.trim()) missing.push("STRIPE_WEBHOOK_SECRET");
  for (const k of STRIPE_PRICE_KEYS) {
    if (!process.env[k]?.trim()) missing.push(k);
  }
  return missing;
}

/** Optional storefront webhook (HMAC) — warn when route is deployed without secret. */
export function missingStripeStoreWebhookSecret(): string[] {
  return process.env.STRIPE_STORE_WEBHOOK_SECRET?.trim() ? [] : ["STRIPE_STORE_WEBHOOK_SECRET"];
}

export function isStripeStoreWebhookConfigured(): boolean {
  return Boolean(process.env.STRIPE_STORE_WEBHOOK_SECRET?.trim());
}

export function missingStripeConnectWebhookSecret(): string[] {
  return process.env.STRIPE_WEBHOOK_CONNECT_SECRET?.trim()
    ? []
    : ["STRIPE_WEBHOOK_CONNECT_SECRET"];
}

export {
  missingGoogleOAuthEnvKeys,
  missingMetaOAuthEnvKeys,
  missingLinkedInOAuthEnvKeys,
  missingWhatsAppCloudEnvKeys,
  isWhatsAppCloudEnvConfigured,
} from "../oauth/oauthEnv";
