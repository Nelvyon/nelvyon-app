/** Shared env readiness checks for SaaS platform connectors. */

const SES_KEYS = ["SES_ACCESS_KEY_ID", "SES_SECRET_ACCESS_KEY", "SES_FROM_EMAIL"] as const;
const TWILIO_KEYS = ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_FROM_NUMBER"] as const;
const STRIPE_KEYS = ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"] as const;
const STRIPE_PRICE_KEYS = ["STRIPE_PRICE_ID_STARTER", "STRIPE_PRICE_ID_PRO", "STRIPE_PRICE_ID_AGENCY"] as const;

export function isEnvKeysConfigured(keys: readonly string[]): boolean {
  return keys.every((k) => Boolean(process.env[k]?.trim()));
}

export function isSesEnvConfigured(): boolean {
  return isEnvKeysConfigured(SES_KEYS);
}

export function isTwilioEnvConfigured(): boolean {
  return isEnvKeysConfigured(TWILIO_KEYS);
}

export function isStripeEnvConfigured(): boolean {
  return isEnvKeysConfigured(STRIPE_KEYS) && isEnvKeysConfigured(STRIPE_PRICE_KEYS);
}

export function missingEnvKeys(keys: readonly string[]): string[] {
  return keys.filter((k) => !process.env[k]?.trim());
}
