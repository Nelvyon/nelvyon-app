import { NextRequest, NextResponse } from "next/server";

import { authenticate } from "@nelvyon/auth";
import { getStripePriceEnvVarName, getStripePriceId, normalizeBillablePlan, type BillablePlan } from "@nelvyon/billing";
import { OsAgentError } from "@nelvyon/os-agents";

import { DbClient } from "../../../../../../../backend/db/DbClient";
import { EarlyAdopterService } from "../../../../../../../backend/billing/earlyAdopterService";
import {
  createSubscriptionCheckoutSession,
  StripePriceNotFoundError,
} from "../../../../../../../backend/stripe/stripeApi";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type CheckoutBody = { planId?: string };

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

export async function POST(req: NextRequest) {
  const ctx: CheckoutLogContext = {
    stripeSecretKeyConfigured: stripeSecretKeyConfigured(),
  };

  try {
    const claims = await authenticate(req);
    ctx.userId = claims.userId;

    let body: CheckoutBody;
    try {
      body = (await req.json()) as CheckoutBody;
    } catch (parseErr) {
      const exception = parseErr instanceof Error ? parseErr.message : String(parseErr);
      logCheckout("invalid_json", { ...ctx, exception });
      return NextResponse.json({ error: "Invalid JSON", code: "invalid_json" }, { status: 400 });
    }

    ctx.planIdReceived = typeof body.planId === "string" ? body.planId : body.planId ?? null;

    const plan = typeof body.planId === "string" ? normalizeBillablePlan(body.planId) : null;
    if (!plan) {
      return checkoutError(
        400,
        `planId inválido: "${String(body.planId ?? "")}". Valores válidos: starter, pro, agency, agency_partner`,
        "invalid_plan_id",
        ctx,
      );
    }
    ctx.planId = plan;

    if (!stripeSecretKeyConfigured()) {
      return checkoutError(
        503,
        "Falta variable de entorno: STRIPE_SECRET_KEY (alternativa: STRIPE_API_KEY)",
        "missing_stripe_secret",
        ctx,
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
        { ...ctx, planId: plan, exception },
        { missingEnvVar, planId: plan },
      );
    }
    ctx.stripePriceId = stripePriceId;

    logCheckout("pre_checkout", {
      ...ctx,
      planIdReceived: ctx.planIdReceived,
      planId: plan,
      stripePriceId,
      stripeSecretKeyConfigured: ctx.stripeSecretKeyConfigured,
    });

    let user: { email: string; stripe_customer_id: string | null } | undefined;
    try {
      const userRows = await DbClient.getInstance().query<{ email: string; stripe_customer_id: string | null }>(
        `SELECT u.email, s.stripe_customer_id
         FROM nelvyon_users u
         LEFT JOIN subscriptions s ON s.user_id = u.user_id
         WHERE u.user_id = $1::uuid
         LIMIT 1`,
        [claims.userId],
      );
      user = userRows[0];
    } catch (dbErr) {
      const exception = dbErr instanceof Error ? dbErr.message : String(dbErr);
      return checkoutError(
        500,
        `Error de base de datos al buscar usuario: ${exception}`,
        "database_error",
        ctx,
        { exception },
      );
    }

    if (!user?.email) {
      return checkoutError(
        404,
        `Usuario no encontrado para checkout (userId=${claims.userId})`,
        "user_not_found",
        ctx,
      );
    }
    ctx.userEmail = user.email;
    ctx.stripeCustomerId = user.stripe_customer_id;

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin;
    const successUrl = `${appUrl}/billing/upgrade?checkout=success&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${appUrl}/precios?checkout=cancelled`;

    let couponId: string | null = null;
    try {
      const ea = EarlyAdopterService.getInstance();
      if (await ea.isEarlyAdopterActive()) {
        const claim = await ea.claimEarlyAdopterSlot(claims.userId);
        couponId = claim.discountCode;
      }
    } catch (eaErr) {
      const exception = eaErr instanceof Error ? eaErr.message : String(eaErr);
      logCheckout("early_adopter_skipped", { ...ctx, exception });
    }
    if (couponId) {
      ctx.couponId = couponId;
    }

    let session: { url: string | null; sessionId: string };
    try {
      session = await createSubscriptionCheckoutSession({
        userId: claims.userId,
        email: user.email,
        plan,
        successUrl,
        cancelUrl,
        couponId,
        customerId: user.stripe_customer_id,
      });
    } catch (stripeErr) {
      if (stripeErr instanceof StripePriceNotFoundError) {
        return checkoutError(
          502,
          stripeErr.message,
          "stripe_price_not_found",
          {
            ...ctx,
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
          ...ctx,
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
        ctx,
        { sessionId: session.sessionId },
      );
    }

    return NextResponse.json({ url: session.url, sessionId: session.sessionId });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized", code: "unauthorized" }, { status: 401 });
    }

    const exception = e instanceof Error ? e.message : String(e);
    const stack = e instanceof Error ? e.stack : undefined;
    return checkoutError(
      500,
      exception,
      "unhandled_exception",
      { ...ctx, stack },
      { exception },
    );
  }
}
