import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = { params: Promise<{ subdomain: string }> };

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

/**
 * POST /api/store/[subdomain]/checkout
 * Creates a Stripe PaymentIntent and returns the client_secret.
 * The client uses Stripe.js to confirm the payment on the frontend.
 */
export async function POST(req: Request, context: RouteContext) {
  try {
    const { subdomain } = await context.params;
    if (!subdomain?.trim()) return NextResponse.json({ error: "subdomain required" }, { status: 400 });

    const stripeKey = process.env.STRIPE_SECRET_KEY?.trim();
    if (!stripeKey) {
      return NextResponse.json({
        pending_stripe: true,
        stripe_message: "Stripe no configurado. Añade STRIPE_SECRET_KEY en Railway.",
      });
    }

    const body = await req.json().catch(() => null) as { items?: CartItem[]; email?: string; name?: string } | null;
    if (!body?.items?.length) return NextResponse.json({ error: "items required" }, { status: 400 });

    const amountCents = Math.round(
      body.items.reduce((sum, item) => sum + item.price * item.quantity, 0) * 100,
    );
    if (amountCents < 50) return NextResponse.json({ error: "Minimum order is 0.50 EUR" }, { status: 400 });

    // Create Stripe PaymentIntent via REST API (no SDK dependency)
    const params = new URLSearchParams({
      amount: String(amountCents),
      currency: "eur",
      "payment_method_types[]": "card",
      "metadata[subdomain]": subdomain,
      "metadata[email]": body.email ?? "",
    });

    const stripeRes = await fetch("https://api.stripe.com/v1/payment_intents", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const intent = await stripeRes.json() as { id?: string; client_secret?: string; error?: { message: string } };
    if (!stripeRes.ok || intent.error) {
      return NextResponse.json({ error: intent.error?.message ?? "Stripe error" }, { status: 502 });
    }

    return NextResponse.json({
      client_secret: intent.client_secret,
      payment_intent_id: intent.id,
      amount: amountCents,
      currency: "eur",
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
