import type { BillablePlan } from "./planConfig";
import { CHECKOUT_STRIPE_PLANS, getStripePriceEnvVarName } from "./planConfig";

export type StripePriceEnvDiagnostic = {
  envVar: string;
  plan: BillablePlan;
  /** Valor crudo de process.env (sin trim). */
  raw: string | undefined;
  /** Valor tras .trim() — el que usa checkout. */
  trimmed: string | undefined;
  rawLength: number;
  trimmedLength: number;
  /** Detecta espacios, saltos de línea o caracteres invisibles en Railway. */
  hasLeadingOrTrailingWhitespace: boolean;
  charCodes: number[];
  isSet: boolean;
};

export function readStripePriceEnvDiagnostic(plan: BillablePlan): StripePriceEnvDiagnostic {
  const envVar = getStripePriceEnvVarName(plan);
  const raw = process.env[envVar];
  const trimmed = raw?.trim();
  return {
    envVar,
    plan,
    raw,
    trimmed: trimmed && trimmed.length > 0 ? trimmed : undefined,
    rawLength: raw?.length ?? 0,
    trimmedLength: trimmed?.length ?? 0,
    hasLeadingOrTrailingWhitespace: Boolean(raw && raw !== trimmed),
    charCodes: trimmed ? [...trimmed].map((c) => c.charCodeAt(0)) : [],
    isSet: Boolean(trimmed && trimmed.length > 0),
  };
}

export function readAllCheckoutStripePriceDiagnostics(): StripePriceEnvDiagnostic[] {
  return CHECKOUT_STRIPE_PLANS.map((plan) => readStripePriceEnvDiagnostic(plan));
}

export function logStripePriceEnvDiagnostic(
  step: string,
  diagnostic: StripePriceEnvDiagnostic,
  extra?: Record<string, unknown>,
): void {
  console.error(
    `[billing/stripe-price] ${step}`,
    JSON.stringify({
      plan: diagnostic.plan,
      envVar: diagnostic.envVar,
      processEnvRaw: diagnostic.raw ?? null,
      processEnvTrimmed: diagnostic.trimmed ?? null,
      rawLength: diagnostic.rawLength,
      trimmedLength: diagnostic.trimmedLength,
      hasLeadingOrTrailingWhitespace: diagnostic.hasLeadingOrTrailingWhitespace,
      charCodes: diagnostic.charCodes,
      ...extra,
    }),
  );
}
