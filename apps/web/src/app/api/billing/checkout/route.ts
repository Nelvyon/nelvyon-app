import { NextRequest, NextResponse } from "next/server";

import { authenticate } from "@nelvyon/auth";
import { normalizeBillablePlan } from "@nelvyon/billing";
import { OsAgentError } from "@nelvyon/os-agents";

import { DbClient } from "../../../../../../../backend/db/DbClient";
import { EarlyAdopterService } from "../../../../../../../backend/billing/earlyAdopterService";
import { createSubscriptionCheckoutSession } from "../../../../../../../backend/stripe/stripeApi";

export const dynamic = 'force-dynamic';
export const runtime = "nodejs";

type CheckoutBody = { planId?: string };

export async function POST(req: NextRequest) {
  try {
    const claims = await authenticate(req);
    let body: CheckoutBody;
    try {
      body = (await req.json()) as CheckoutBody;
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const plan = typeof body.planId === "string" ? normalizeBillablePlan(body.planId) : null;
    if (!plan) {
      return NextResponse.json({ error: "planId debe ser starter, pro, agency o agency_partner" }, { status: 400 });
    }

    const userRows = await DbClient.getInstance().query<{ email: string; stripe_customer_id: string | null }>(
      `SELECT u.email,
              COALESCE(s.stripe_customer_id, s.paddle_customer_id) AS stripe_customer_id
       FROM nelvyon_users u
       LEFT JOIN subscriptions s ON s.user_id::text = u.user_id
       WHERE u.user_id = $1
       LIMIT 1`,
      [claims.userId],
    );
    const user = userRows[0];
    if (!user?.email) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin;
    const successUrl = `${appUrl}/billing/upgrade?checkout=success&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${appUrl}/pricing?checkout=cancelled`;

    let couponId: string | null = null;
    const ea = EarlyAdopterService.getInstance();
    if (await ea.isEarlyAdopterActive()) {
      const claim = await ea.claimEarlyAdopterSlot(claims.userId);
      couponId = claim.discountCode;
    }

    const session = await createSubscriptionCheckoutSession({
      userId: claims.userId,
      email: user.email,
      plan,
      successUrl,
      cancelUrl,
      couponId,
      customerId: user.stripe_customer_id,
    });

    if (!session.url) {
      return NextResponse.json({ error: "Stripe no devolvió URL de checkout" }, { status: 502 });
    }

    return NextResponse.json({ url: session.url, sessionId: session.sessionId });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[billing/checkout]", e);
    return NextResponse.json({ error: "No se pudo iniciar el checkout" }, { status: 500 });
  }
}
