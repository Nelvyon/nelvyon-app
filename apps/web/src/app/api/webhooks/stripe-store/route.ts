import { NextResponse } from "next/server";
import { getSaasStoreService } from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/webhooks/stripe-store
 * Handles payment_intent.succeeded → mark order paid + reduce stock (already done on creation, idempotent).
 * Verify using STRIPE_STORE_WEBHOOK_SECRET or STRIPE_WEBHOOK_SECRET.
 */
export async function POST(req: Request) {
  const webhookSecret = process.env.STRIPE_STORE_WEBHOOK_SECRET ?? process.env.STRIPE_WEBHOOK_SECRET;
  const sig = req.headers.get("stripe-signature");
  const rawBody = await req.text();

  if (webhookSecret && sig) {
    // Stripe signature verification (manual HMAC without stripe-node SDK)
    try {
      const parts = sig.split(",").reduce<Record<string, string>>((acc, part) => {
        const [k, v] = part.split("=");
        acc[k] = v;
        return acc;
      }, {});
      const timestamp = parts["t"];
      const v1 = parts["v1"];
      if (!timestamp || !v1) throw new Error("invalid signature");

      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        "raw", encoder.encode(webhookSecret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
      );
      const mac = await crypto.subtle.sign("HMAC", key, encoder.encode(`${timestamp}.${rawBody}`));
      const computed = Array.from(new Uint8Array(mac)).map(b => b.toString(16).padStart(2, "0")).join("");
      if (computed !== v1) return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    } catch {
      return NextResponse.json({ error: "Signature verification failed" }, { status: 400 });
    }
  }

  let event: { type: string; data: { object: Record<string, unknown> } };
  try {
    event = JSON.parse(rawBody) as typeof event;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (event.type === "payment_intent.succeeded") {
    const pi = event.data.object;
    const paymentIntentId = typeof pi.id === "string" ? pi.id : null;
    if (paymentIntentId) {
      await getSaasStoreService().handlePaymentSucceeded(paymentIntentId);
    }
  }

  return NextResponse.json({ received: true });
}
