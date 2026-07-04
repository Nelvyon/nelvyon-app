import { NextRequest, NextResponse } from "next/server";

import { getStripePriceEnvVarName, getStripePriceId, normalizeBillablePlan, type BillablePlan } from "@nelvyon/billing";
import { readStripePriceEnvDiagnostic, logStripePriceEnvDiagnostic } from "@nelvyon/billing";
import {
  buildPricePipelineTrace,
  logPricePipelineTrace,
  readRailwayDeployDiagnostic,
  readStripeKeyDiagnostic,
} from "../../../../../../../backend/billing/stripePricePipelineTrace";
import { OsAgentError } from "@nelvyon/os-agents";
import { requireSaasContext, saasErrorBody, saasErrorStatus } from "@nelvyon/saas";

import { DbClient } from "../../../../../../../backend/db/DbClient";
import { EarlyAdopterService } from "../../../../../../../backend/billing/earlyAdopterService";
import {
  createSubscriptionCheckoutSession,
  StripePriceNotFoundError,
} from "../../../../../../../backend/stripe/stripeApi";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type CheckoutBody = {
  planId?: string;
  successUrl?: string;
  cancelUrl?: string;
};

type CheckoutLogContext = Record<string, unknown>;

function logCheckout(step: string, ctx: CheckoutLogContext): void {
  console.error(`[billing/checkout] ${step}`, JSON.stringify(ctx));
}

function stripeSecretKeyConfigured(): boolean {
  return Boolean((process.env.STRIPE_SECRET_KEY ?? process.env.STRIPE_API_KEY ?? "").trim());
}

function stripePriceEnvVar(plan: BillablePlan): string {
  return getStripePriceEnvVarName(plan);
}

function parseStripeApiError(message: string): {
  httpStatus?: number;
  stripeMessage: string;
  stripeType?: string;
  stripeCode?: string;
  raw?: string;
} {
  const match = message.match(/Stripe API \w+ .+ failed \((\d+)\):([\s\S]*)$/);
  if (!match) {
    return { stripeMessage: message };
  }

  const httpStatus = Number(match[1]);
  const raw = match[2]?.trim() ?? "";
  try {
    const parsed = JSON.parse(raw) as {
      error?: { message?: string; type?: string; code?: string };
    };
    const stripeErr = parsed.error;
    return {
      httpStatus,
      stripeMessage: stripeErr?.message ?? raw,
      stripeType: stripeErr?.type,
      stripeCode: stripeErr?.code,
      raw,
    };
  } catch {
    return { httpStatus, stripeMessage: raw || message, raw };
  }
}

function checkoutError(
  status: number,
  error: string,
  step: string,
  ctx: CheckoutLogContext,
  extra?: Record<string, unknown>,
): NextResponse {
  logCheckout(step, { ...ctx, httpStatus: status, error, ...extra });
  return NextResponse.json({ error, code: step, ...extra }, { status });
}

function resolveCheckoutUrl(raw: string | undefined, fallback: string, appUrl: string): string {
  if (!raw?.trim()) return fallback;
  try {
    const parsed = new URL(raw.trim(), appUrl);
    const base = new URL(appUrl);
    if (parsed.origin !== base.origin) return fallback;
    return parsed.toString();
  } catch {
    return fallback;
  }
}

export async function POST(req: NextRequest) {
  const logCtx: CheckoutLogContext = {
    stripeSecretKeyConfigured: stripeSecretKeyConfigured(),
    stripeKey: readStripeKeyDiagnostic(),
    railway: readRailwayDeployDiagnostic(),
    legacyFallbackUsed: false,
  };

  try {
    const auth = await requireSaasContext(req, "billing.read");
    logCtx.userId = auth.claims.userId;

    let body: CheckoutBody;
    try {
      body = (await req.json()) as CheckoutBody;
    } catch (parseErr) {
      const exception = parseErr instanceof Error ? parseErr.message : String(parseErr);
      logCheckout("invalid_json", { ...logCtx, exception });
      return NextResponse.json({ error: "Invalid JSON", code: "invalid_json" }, { status: 400 });
    }

    logCtx.planIdReceived = typeof body.planId === "string" ? body.planId : body.planId ?? null;

    const plan = typeof body.planId === "string" ? normalizeBillablePlan(body.planId) : null;
    if (!plan) {
      return checkoutError(
        400,
        `planId inválido: "${String(body.planId ?? "")}". Valores válidos: starter, pro, agency, agency_partner`,
        "invalid_plan_id",
        logCtx,
      );
    }
    logCtx.planId = plan;

    const envDiagnostic = readStripePriceEnvDiagnostic(plan);
    logStripePriceEnvDiagnostic("checkout POST env", envDiagnostic, {
      planIdReceived: logCtx.planIdReceived,
      userId: logCtx.userId,
    });
    logCtx.stripePriceEnvRaw = envDiagnostic.raw ?? null;
    logCtx.stripePriceEnvTrimmed = envDiagnostic.trimmed ?? null;

    if (!stripeSecretKeyConfigured()) {
      return checkoutError(
        503,
        "Falta variable de entorno: STRIPE_SECRET_KEY (alternativa: STRIPE_API_KEY)",
        "missing_stripe_secret",
        logCtx,
        { missingEnvVar: "STRIPE_SECRET_KEY" },
      );
    }

    let stripePriceId: string;
    try {
      stripePriceId = getStripePriceId(plan);
    } catch (priceErr) {
      const exception = priceErr instanceof Error ? priceErr.message : String(priceErr);
      const missingEnvVar = stripePriceEnvVar(plan);
      return checkoutError(
        503,
        `Falta variable de entorno: ${missingEnvVar}`,
        "missing_stripe_price",
        { ...logCtx, planId: plan, exception },
        { missingEnvVar, planId: plan },
      );
    }
    logCtx.stripePriceId = stripePriceId;

    logPricePipelineTrace(
      "checkout route resolved price",
      buildPricePipelineTrace({
        plan,
        planIdReceived: String(logCtx.planIdReceived ?? ""),
        envVar: envDiagnostic.envVar,
        raw: envDiagnostic.raw,
        trimmed: envDiagnostic.trimmed,
        resolvedPriceId: stripePriceId,
      }),
    );

    logCheckout("pre_checkout", {
      ...logCtx,
      planIdReceived: logCtx.planIdReceived,
      planId: plan,
      stripePriceId,
      stripeSecretKeyConfigured: logCtx.stripeSecretKeyConfigured,
    });

    let user: { email: string; stripe_customer_id: string | null } | undefined;
    try {
      const userRows = await DbClient.getInstance().query<{ email: string; stripe_customer_id: string | null }>(
        `SELECT u.email, s.stripe_customer_id
         FROM nelvyon_users u
         LEFT JOIN subscriptions s ON s.user_id = u.user_id
         WHERE u.user_id = $1::uuid
         LIMIT 1`,
        [auth.claims.userId],
      );
      user = userRows[0];
    } catch (dbErr) {
      const exception = dbErr instanceof Error ? dbErr.message : String(dbErr);
      return checkoutError(
        500,
        `Error de base de datos al buscar usuario: ${exception}`,
        "database_error",
        logCtx,
        { exception },
      );
    }

    if (!user?.email) {
      return checkoutError(
        404,
        `Usuario no encontrado para checkout (userId=${auth.claims.userId})`,
        "user_not_found",
        logCtx,
      );
    }
    logCtx.userEmail = user.email;
    logCtx.stripeCustomerId = user.stripe_customer_id;

    const tenantId = auth.tenant.id;
    logCtx.tenantId = tenantId;

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin;
    const defaultSuccess = `${appUrl}/saas/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}`;
    const defaultCancel = `${appUrl}/saas/billing?checkout=cancelled`;
    const successUrl = resolveCheckoutUrl(body.successUrl, defaultSuccess, appUrl);
    const cancelUrl = resolveCheckoutUrl(body.cancelUrl, defaultCancel, appUrl);

    let couponId: string | null = null;
    try {
      const ea = EarlyAdopterService.getInstance();
      if (await ea.isEarlyAdopterActive()) {
        const claim = await ea.claimEarlyAdopterSlot(auth.claims.userId);
        couponId = claim.discountCode;
      }
    } catch (eaErr) {
      const exception = eaErr instanceof Error ? eaErr.message : String(eaErr);
      logCheckout("early_adopter_skipped", { ...logCtx, exception });
    }
    if (couponId) {
      logCtx.couponId = couponId;
    }

    let session: { url: string | null; sessionId: string };
    try {
      session = await createSubscriptionCheckoutSession({
        userId: auth.claims.userId,
        email: user.email,
        plan,
        successUrl,
        cancelUrl,
        couponId,
        customerId: user.stripe_customer_id,
        tenantId,
      });
    } catch (stripeErr) {
      if (stripeErr instanceof StripePriceNotFoundError) {
        return checkoutError(
          502,
          stripeErr.message,
          "stripe_price_not_found",
          {
            ...logCtx,
            planId: plan,
            stripePriceId: stripeErr.priceId,
            envVar: stripeErr.envVar,
            stripeMessage: stripeErr.stripeMessage,
          },
          {
            priceId: stripeErr.priceId,
            envVar: stripeErr.envVar,
            stripeMessage: stripeErr.stripeMessage,
          },
        );
      }
      const exception = stripeErr instanceof Error ? stripeErr.message : String(stripeErr);
      const parsed = parseStripeApiError(exception);
      const stripeHttpStatus = parsed.httpStatus ?? 502;
      return checkoutError(
        stripeHttpStatus >= 400 && stripeHttpStatus < 500 ? 502 : 502,
        parsed.stripeMessage,
        "stripe_session_failed",
        {
          ...logCtx,
          exception,
          stripeHttpStatus,
          stripeType: parsed.stripeType,
          stripeCode: parsed.stripeCode,
        },
        {
          stripeHttpStatus,
          stripeType: parsed.stripeType,
          stripeCode: parsed.stripeCode,
          stripeResponse: parsed.raw,
        },
      );
    }

    if (!session.url) {
      return checkoutError(
        502,
        `Stripe creó la sesión (${session.sessionId}) pero no devolvió URL de checkout`,
        "stripe_missing_checkout_url",
        logCtx,
        { sessionId: session.sessionId },
      );
    }

    return NextResponse.json({ url: session.url, sessionId: session.sessionId });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized", code: "unauthorized" }, { status: 401 });
    }
    const rbacStatus = saasErrorStatus(e);
    if (rbacStatus === 401 || rbacStatus === 403 || rbacStatus === 404) {
      return NextResponse.json(saasErrorBody(e), { status: rbacStatus });
    }

    const exception = e instanceof Error ? e.message : String(e);
    const stack = e instanceof Error ? e.stack : undefined;
    return checkoutError(
      500,
      exception,
      "unhandled_exception",
      { ...logCtx, stack },
      { exception },
    );
  }
}
