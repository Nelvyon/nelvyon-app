import { NextResponse } from "next/server";

import { getSaasMembershipService } from "@nelvyon/saas";
import { verifyStripeWebhook } from "../../../../../../../backend/stripe/webhookHandler";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/webhooks/stripe-membership
 * Handles subscription events for SaaS membership — requires Stripe signature.
 */
export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signatureHeader = req.headers.get("stripe-signature") ?? "";
    const event = verifyStripeWebhook(rawBody, signatureHeader);

    const obj = (event.data?.object ?? {}) as unknown as Record<string, unknown>;
    const tenantId = String((obj.metadata as Record<string, unknown> | undefined)?.tenant_id ?? "");
    const stripeSubId = String(obj.id ?? "");

    if (!tenantId || !stripeSubId) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    const svc = getSaasMembershipService();

    if (event.type === "customer.subscription.created") {
      await svc.updateMemberStatus(tenantId, stripeSubId, "active");
    } else if (
      event.type === "customer.subscription.deleted" ||
      event.type === "invoice.payment_failed"
    ) {
      await svc.updateMemberStatus(
        tenantId,
        stripeSubId,
        event.type === "customer.subscription.deleted" ? "cancelled" : "expired",
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "webhook error";
    if (
      message.includes("signature") ||
      message.includes("Invalid") ||
      message.includes("STRIPE_WEBHOOK_SECRET")
    ) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }
    console.error("[stripe-membership webhook]", e);
    return NextResponse.json({ error: "webhook error" }, { status: 500 });
  }
}
