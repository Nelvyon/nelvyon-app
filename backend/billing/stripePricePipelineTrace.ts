/** Diagnóstico de qué env var alimenta la API Stripe (sin exponer el secret completo). */
export type StripeKeyDiagnostic = {
  sourceEnvVar: "STRIPE_SECRET_KEY" | "STRIPE_API_KEY" | "none";
  prefix: "sk_live" | "sk_test" | "unknown";
  suffix: string;
  isConfigured: boolean;
};

export function readStripeKeyDiagnostic(): StripeKeyDiagnostic {
  const fromSecret = process.env.STRIPE_SECRET_KEY?.trim();
  const fromApiKey = process.env.STRIPE_API_KEY?.trim();
  const key = fromSecret || fromApiKey || "";
  if (!key) {
    return { sourceEnvVar: "none", prefix: "unknown", suffix: "", isConfigured: false };
  }
  const prefix = key.startsWith("sk_live")
    ? "sk_live"
    : key.startsWith("sk_test")
      ? "sk_test"
      : "unknown";
  return {
    sourceEnvVar: fromSecret ? "STRIPE_SECRET_KEY" : "STRIPE_API_KEY",
    prefix,
    suffix: key.length > 8 ? key.slice(-4) : "****",
    isConfigured: true,
  };
}

export function readRailwayDeployDiagnostic(): Record<string, string | null> {
  return {
    railwayGitCommitSha: process.env.RAILWAY_GIT_COMMIT_SHA?.trim() ?? null,
    railwayDeploymentId: process.env.RAILWAY_DEPLOYMENT_ID?.trim() ?? null,
    railwayServiceName: process.env.RAILWAY_SERVICE_NAME?.trim() ?? null,
    railwayEnvironment: process.env.RAILWAY_ENVIRONMENT_NAME?.trim() ?? null,
    nodeEnv: process.env.NODE_ENV ?? null,
  };
}

/** Trazabilidad completa env → retrieve → checkout (sin secret key). */
export type StripePricePipelineTrace = {
  plan: string;
  planIdReceived: string | null;
  envVar: string;
  processEnvRaw: string | null;
  processEnvTrimmed: string | null;
  getStripePriceIdResult: string | null;
  retrieveUrl: string | null;
  checkoutLineItemPrice: string | null;
  legacyFallbackUsed: false;
  stripeKey: StripeKeyDiagnostic;
  railway: Record<string, string | null>;
};

export function buildPricePipelineTrace(opts: {
  plan: string;
  planIdReceived: string | null;
  envVar: string;
  raw: string | undefined;
  trimmed: string | undefined;
  resolvedPriceId: string | null;
  checkoutLineItemPrice?: string | null;
}): StripePricePipelineTrace {
  const trimmed = opts.trimmed ?? null;
  return {
    plan: opts.plan,
    planIdReceived: opts.planIdReceived,
    envVar: opts.envVar,
    processEnvRaw: opts.raw ?? null,
    processEnvTrimmed: trimmed,
    getStripePriceIdResult: opts.resolvedPriceId,
    retrieveUrl: trimmed ? `GET /v1/prices/${trimmed}` : null,
    checkoutLineItemPrice: opts.checkoutLineItemPrice ?? opts.resolvedPriceId,
    legacyFallbackUsed: false,
    stripeKey: readStripeKeyDiagnostic(),
    railway: readRailwayDeployDiagnostic(),
  };
}

export function logPricePipelineTrace(step: string, trace: StripePricePipelineTrace): void {
  console.error(`[billing/price-pipeline] ${step}`, JSON.stringify(trace));
}
