import { NextRequest, NextResponse } from "next/server";

import {
  CHECKOUT_STRIPE_PLANS,
  getStripePriceEnvVarName,
  readStripePriceEnvDiagnostic,
} from "@nelvyon/billing";

import {
  buildPricePipelineTrace,
  readRailwayDeployDiagnostic,
  readStripeKeyDiagnostic,
} from "../../../../../../../backend/billing/stripePricePipelineTrace";
import {
  retrieveStripeAccount,
  retrieveStripePrice,
  StripePriceNotFoundError,
} from "../../../../../../../backend/stripe/stripeApi";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function authorize(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  return req.headers.get("x-cron-secret")?.trim() === secret;
}

/**
 * GET /api/billing/price-audit
 * Evidencia: process.env exacto, sin fallback legacy, retrieve vs checkout, cuenta/modo Stripe, deploy Railway.
 */
export async function GET(req: NextRequest) {
  if (!authorize(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const stripeKey = readStripeKeyDiagnostic();
  const railway = readRailwayDeployDiagnostic();

  let stripeAccount: { id: string; email: string | null } | null = null;
  let stripeAccountError: string | null = null;
  if (stripeKey.isConfigured) {
    try {
      stripeAccount = await retrieveStripeAccount();
    } catch (e) {
      stripeAccountError = e instanceof Error ? e.message : String(e);
    }
  }

  const plans = await Promise.all(
    CHECKOUT_STRIPE_PLANS.map(async (plan) => {
      const d = readStripePriceEnvDiagnostic(plan);
      const envVar = getStripePriceEnvVarName(plan);
      const trace = buildPricePipelineTrace({
        plan,
        planIdReceived: plan,
        envVar,
        raw: d.raw,
        trimmed: d.trimmed,
        resolvedPriceId: d.trimmed ?? null,
        checkoutLineItemPrice: d.trimmed ?? null,
      });

      const row: Record<string, unknown> = {
        ...trace,
        charCodes: d.charCodes,
        stripeRetrieveOk: false,
        stripePriceIdFromApi: null as string | null,
        stripeActive: null as boolean | null,
        error: null as string | null,
      };

      if (!d.trimmed) {
        row.error = `Falta ${envVar}`;
        return row;
      }

      try {
        const price = await retrieveStripePrice(d.trimmed);
        row.stripeRetrieveOk = true;
        row.stripePriceIdFromApi = price.id;
        row.stripeActive = price.active;
        row.envMatchesStripeApi = price.id === d.trimmed;
        if (!price.active) row.error = "Price inactivo en Stripe";
      } catch (e) {
        if (e instanceof StripePriceNotFoundError) {
          row.error = e.message;
        } else {
          row.error = e instanceof Error ? e.message : String(e);
        }
      }

      return row;
    }),
  );

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    service: "@nelvyon/web",
    legacyFallbackUsed: false,
    envVarsUsed: {
      starter: "STRIPE_PRICE_ID_STARTER",
      pro: "STRIPE_PRICE_ID_PRO",
      agency: "STRIPE_PRICE_ID_AGENCY",
    },
    frontendPlanId: "starter → POST { planId: \"starter\" } → normalizeBillablePlan → STRIPE_PRICE_ID_STARTER",
    stripeKey,
    stripeAccount,
    stripeAccountError,
    railway,
    plans,
    allValid: plans.every((p) => p.stripeRetrieveOk === true && !p.error),
  });
}
