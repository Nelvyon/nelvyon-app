import { NextRequest, NextResponse } from "next/server";

import {
  CHECKOUT_STRIPE_PLANS,
  readStripePriceEnvDiagnostic,
  type BillablePlan,
} from "@nelvyon/billing";

import {
  retrieveStripePrice,
  StripePriceNotFoundError,
} from "../../../../../../../backend/stripe/stripeApi";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function authorize(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const header = req.headers.get("x-cron-secret")?.trim();
  return header === secret;
}

type PlanAuditRow = {
  plan: BillablePlan;
  envVar: string;
  processEnvRaw: string | null;
  processEnvTrimmed: string | null;
  charCodes: number[];
  stripeRetrieveOk: boolean;
  stripePriceId: string | null;
  stripeActive: boolean | null;
  envMatchesStripe: boolean | null;
  error: string | null;
};

async function auditPlan(plan: BillablePlan): Promise<PlanAuditRow> {
  const d = readStripePriceEnvDiagnostic(plan);
  const row: PlanAuditRow = {
    plan,
    envVar: d.envVar,
    processEnvRaw: d.raw ?? null,
    processEnvTrimmed: d.trimmed ?? null,
    charCodes: d.charCodes,
    stripeRetrieveOk: false,
    stripePriceId: null,
    stripeActive: null,
    envMatchesStripe: null,
    error: null,
  };

  if (!d.trimmed) {
    row.error = `Falta variable de entorno: ${d.envVar}`;
    return row;
  }

  try {
    const price = await retrieveStripePrice(d.trimmed);
    row.stripeRetrieveOk = true;
    row.stripePriceId = price.id;
    row.stripeActive = price.active;
    row.envMatchesStripe = price.id === d.trimmed;
    if (!price.active) {
      row.error = "Price existe en Stripe pero está inactivo";
    }
  } catch (e: unknown) {
    if (e instanceof StripePriceNotFoundError) {
      row.error = e.message;
    } else {
      row.error = e instanceof Error ? e.message : String(e);
    }
  }

  return row;
}

/**
 * GET /api/billing/price-audit
 * Header: x-cron-secret = CRON_SECRET
 * Compara process.env STRIPE_PRICE_ID_* vs stripe.prices.retrieve en la cuenta Live/Test del secret key.
 */
export async function GET(req: NextRequest) {
  if (!authorize(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const stripeSecretConfigured = Boolean(
    (process.env.STRIPE_SECRET_KEY ?? process.env.STRIPE_API_KEY ?? "").trim(),
  );
  const stripeKeyMode = (process.env.STRIPE_SECRET_KEY ?? process.env.STRIPE_API_KEY ?? "").startsWith("sk_live")
    ? "live"
    : (process.env.STRIPE_SECRET_KEY ?? process.env.STRIPE_API_KEY ?? "").startsWith("sk_test")
      ? "test"
      : "unknown";

  const plans = await Promise.all(CHECKOUT_STRIPE_PLANS.map((plan) => auditPlan(plan)));

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    service: "@nelvyon/web",
    stripeSecretConfigured,
    stripeKeyMode,
    note: "Checkout SaaS usa solo STRIPE_PRICE_ID_STARTER|PRO|AGENCY en este servicio. Python API (:8000) usa las mismas vars para monthly.",
    plans,
    allValid: plans.every((p) => p.stripeRetrieveOk && p.stripeActive && !p.error),
  });
}
