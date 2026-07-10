/**
 * Production environment validation — fail-fast checks for critical ops vars.
 * No secrets logged; returns missing key names only.
 */
import {
  isSesEnvConfigured,
  isStripeEnvConfigured,
  missingEnvKeys,
} from "../saas/saasEnv";

export type EnvValidationResult = {
  ok: boolean;
  environment: string;
  critical: string[];
  warnings: string[];
};

const CRITICAL_PROD_KEYS = ["JWT_SECRET", "DATABASE_URL", "CRON_SECRET"] as const;

function isProductionRuntime(): boolean {
  return process.env.NODE_ENV === "production";
}

export function validateProductionEnv(): EnvValidationResult {
  const critical: string[] = [];
  const warnings: string[] = [];

  if (!isProductionRuntime()) {
    return { ok: true, environment: process.env.NODE_ENV ?? "development", critical, warnings };
  }

  for (const key of CRITICAL_PROD_KEYS) {
    if (!process.env[key]?.trim()) critical.push(key);
  }

  const jwt = process.env.JWT_SECRET?.trim() ?? "";
  if (jwt.length > 0 && jwt.length < 32) {
    critical.push("JWT_SECRET_TOO_SHORT");
  }

  const cron = process.env.CRON_SECRET?.trim() ?? "";
  if (cron.length > 0 && cron.length < 16) {
    critical.push("CRON_SECRET_TOO_SHORT");
  }

  if (!process.env.NEXT_PUBLIC_APP_URL?.trim()) {
    warnings.push("NEXT_PUBLIC_APP_URL");
  }
  if (!process.env.TRACKING_SECRET?.trim() && !process.env.JWT_SECRET?.trim()) {
    warnings.push("TRACKING_SECRET");
  }

  if (!isStripeEnvConfigured()) {
    warnings.push(...missingEnvKeys([
      "STRIPE_SECRET_KEY",
      "STRIPE_WEBHOOK_SECRET",
      "STRIPE_PRICE_ID_STARTER",
    ]));
  }
  if (!isSesEnvConfigured()) {
    warnings.push(...missingEnvKeys(["SES_ACCESS_KEY_ID", "SES_SECRET_ACCESS_KEY", "SES_FROM_EMAIL"]));
  }
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN?.trim()) {
    warnings.push("NEXT_PUBLIC_SENTRY_DSN");
  }

  return {
    ok: critical.length === 0,
    environment: "production",
    critical: [...new Set(critical)],
    warnings: [...new Set(warnings)],
  };
}

export function logProductionEnvValidation(): EnvValidationResult {
  const result = validateProductionEnv();
  if (!isProductionRuntime()) return result;

  if (result.critical.length > 0) {
    console.error(
      "[prod-env] CRITICAL missing or invalid:",
      result.critical.join(", "),
    );
  }
  if (result.warnings.length > 0) {
    console.warn("[prod-env] warnings:", result.warnings.join(", "));
  }
  if (result.ok && result.warnings.length === 0) {
    console.info("[prod-env] validation OK");
  }
  return result;
}
