/**
 * POST /api/public/funnel/[slug]/checkout
 * Creates a Stripe Checkout Session for a funnel checkout step.
 * Body: { stepId, sessionId?, amount, currency?, productName?, successPath?, cancelPath? }
 *
 * amount: integer in smallest currency unit (cents for EUR/USD)
 * Returns: { checkoutUrl }
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getSaasFunnelService } from "@nelvyon/saas";

const ipCounts = new Map<string, { n: number; resetAt: number }>();
function checkLimit(ip: string): boolean {
  const now = Date.now();
  const e = ipCounts.get(ip);
  if (!e || e.resetAt < now) { ipCounts.set(ip, { n: 1, resetAt: now + 60_000 }); return true; }
  e.n++;
  return e.n <= 30;
}

type RouteCtx = { params: Promise<{ slug: string }> };

export async function POST(req: Request, ctx: RouteCtx) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!checkLimit(ip)) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });

  const { slug } = await ctx.params;
  let body: Record<string, unknown>;
  try { body = await req.json() as Record<string, unknown>; }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const amount = typeof body.amount === "number" ? body.amount : 0;
  if (amount < 50) return NextResponse.json({ error: "amount must be ≥50 (cents)" }, { status: 400 });

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });

  try {
    const svc = getSaasFunnelService();
    const funnel = await svc.getByPublicSlug(slug);
    if (!funnel) return NextResponse.json({ error: "Funnel not found" }, { status: 404 });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const successPath = typeof body.successPath === "string" ? body.successPath : `/f/${slug}/success`;
    const cancelPath  = typeof body.cancelPath  === "string" ? body.cancelPath  : `/f/${slug}`;
    const currency    = typeof body.currency === "string" ? body.currency.toLowerCase() : "eur";
    const productName = typeof body.productName === "string" ? body.productName : funnel.name;
    const stepId      = typeof body.stepId === "string" ? body.stepId : null;
    const sessionId   = typeof body.sessionId === "string" ? body.sessionId : null;

    const params = new URLSearchParams({
      "mode": "payment",
      "payment_method_types[0]": "card",
      "line_items[0][price_data][currency]": currency,
      "line_items[0][price_data][unit_amount]": String(amount),
      "line_items[0][price_data][product_data][name]": productName,
      "line_items[0][quantity]": "1",
      "success_url": `${appUrl}${successPath}?session_id={CHECKOUT_SESSION_ID}`,
      "cancel_url": `${appUrl}${cancelPath}`,
      "metadata[funnel_id]": funnel.id,
      "metadata[funnel_slug]": slug,
    });
    if (stepId) params.set("metadata[step_id]", stepId);
    if (sessionId) params.set("metadata[session_id]", sessionId);

    const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!stripeRes.ok) {
      const err = await stripeRes.json() as { error?: { message?: string } };
      return NextResponse.json({ error: err.error?.message ?? "Stripe error" }, { status: 502 });
    }

    const session = await stripeRes.json() as { url: string | null; id: string };

    // Record checkout_start event
    if (stepId) {
      void svc.recordEvent(funnel.tenantId, {
        funnelId: funnel.id, stepId, eventType: "checkout_start", sessionId,
        metadata: { stripe_session_id: session.id, amount, currency },
      });
    }

    return NextResponse.json({ checkoutUrl: session.url, sessionId: session.id });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
