import { NextResponse } from "next/server";
import { getSaasMembershipService } from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/webhooks/stripe-membership
 * Handles subscription.created / customer.subscription.deleted / invoice.payment_failed
 * from Stripe. Signature verification delegated to the main stripe webhook (shares secret).
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { type?: string; data?: { object?: Record<string, unknown> } };
    const eventType = body.type ?? "";
    const obj = body.data?.object ?? {};

    const tenantId = String((obj.metadata as Record<string, unknown> | undefined)?.tenant_id ?? "");
    const stripeSubId = String(obj.id ?? "");

    if (!tenantId || !stripeSubId) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    const svc = getSaasMembershipService();

    if (eventType === "customer.subscription.created") {
      await svc.updateMemberStatus(tenantId, stripeSubId, "active");
    } else if (
      eventType === "customer.subscription.deleted" ||
      eventType === "invoice.payment_failed"
    ) {
      await svc.updateMemberStatus(
        tenantId,
        stripeSubId,
        eventType === "customer.subscription.deleted" ? "cancelled" : "expired"
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[stripe-membership webhook]", e);
    return NextResponse.json({ error: "webhook error" }, { status: 500 });
  }
}
