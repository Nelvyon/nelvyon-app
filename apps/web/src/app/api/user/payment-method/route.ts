import { NextRequest, NextResponse } from "next/server";

import { authenticate } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";

import { DbClient } from "../../../../../../../backend/db/DbClient";
import {
  STRIPE_BILLING_PORTAL_FALLBACK,
  type StripeCardSummary,
  resolveStripePaymentMethodContext,
} from "../../../../../../../backend/stripe/stripeApi";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ACTIVE_STATUSES = new Set(["active", "trialing", "past_due", "paused"]);

export type PaymentMethodApiResponse = {
  lastFour?: string;
  cardType?: string;
  expiryMonth?: number;
  expiryYear?: number;
  updateUrl: string | null;
};

export async function GET(_req: NextRequest) {
  try {
    const claims = await authenticate(_req);
    const rows = await DbClient.getInstance().query<{
      stripe_subscription_id: string | null;
      stripe_customer_id: string | null;
      status: string;
    }>(
      `SELECT COALESCE(stripe_subscription_id, paddle_subscription_id) AS stripe_subscription_id,
              COALESCE(stripe_customer_id, paddle_customer_id) AS stripe_customer_id,
              status
       FROM subscriptions
       WHERE user_id::text = $1
       LIMIT 1`,
      [claims.userId],
    );
    const row = rows[0];
    const subId = row?.stripe_subscription_id?.trim();
    const status = (row?.status ?? "").toLowerCase();
    const hasBillableSubscription = Boolean(subId && ACTIVE_STATUSES.has(status));

    if (!hasBillableSubscription) {
      const empty: PaymentMethodApiResponse = { updateUrl: null };
      return NextResponse.json(empty);
    }

    let card: StripeCardSummary = {};
    let updateUrl: string | null = null;

    try {
      const ctx = await resolveStripePaymentMethodContext(subId!, row?.stripe_customer_id?.trim() || null);
      card = ctx.card;
      updateUrl = ctx.portalUpdatePaymentUrl ?? STRIPE_BILLING_PORTAL_FALLBACK;
    } catch (e) {
      console.warn("[payment-method] Stripe resolve failed:", e);
      updateUrl = STRIPE_BILLING_PORTAL_FALLBACK;
    }

    if (!updateUrl) {
      updateUrl = STRIPE_BILLING_PORTAL_FALLBACK;
    }

    const body: PaymentMethodApiResponse = {
      lastFour: card.lastFour,
      cardType: card.cardType,
      expiryMonth: card.expiryMonth,
      expiryYear: card.expiryYear,
      updateUrl,
    };
    return NextResponse.json(body);
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw e;
  }
}
