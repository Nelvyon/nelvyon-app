import { NextResponse } from "next/server";
import { getSaasStoreService } from "@nelvyon/saas";
import { DbClient } from "@/../../backend/db/DbClient";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = { params: Promise<{ subdomain: string }> };

interface CartItem {
  id?: string;
  name: string;
  price: number;
  quantity: number;
  variantName?: string;
  sku?: string;
}

async function resolveTenantId(subdomain: string): Promise<string | null> {
  const db = DbClient.getInstance();
  const rows = await db.query<{ id: string }>(
    `SELECT id FROM saas_tenants WHERE subdomain = $1 OR slug = $1 LIMIT 1`, [subdomain],
  );
  return rows[0]?.id ?? null;
}

/**
 * POST /api/store/[subdomain]/checkout
 * Creates Stripe PaymentIntent + order in DB with EU VAT calculation.
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

    const body = await req.json().catch(() => null) as {
      items?: CartItem[];
      email?: string;
      name?: string;
      address?: Record<string, string>;
    } | null;
    if (!body?.items?.length) return NextResponse.json({ error: "items required" }, { status: 400 });
    if (!body.email?.trim()) return NextResponse.json({ error: "email required" }, { status: 400 });

    // Resolve tenant for IVA/VAT settings
    const tenantId = await resolveTenantId(subdomain);
    const svc = getSaasStoreService();
    const settings = tenantId ? await svc.getSettings(tenantId) : null;
    const vatPct = settings?.vatPct ?? 21;
    const vatIncluded = settings?.vatIncluded ?? true;
    const shippingFee = settings?.shippingFee ?? 0;
    const currency = settings?.currency ?? "EUR";

    const subtotal = body.items.reduce((s, i) => s + i.price * i.quantity, 0);
    const vatAmount = vatIncluded ? 0 : Math.round(subtotal * vatPct) / 100;
    const total = subtotal + vatAmount + shippingFee;

    const amountCents = Math.round(total * 100);
    if (amountCents < 50) return NextResponse.json({ error: "Minimum order is 0.50" }, { status: 400 });

    // Create Stripe PaymentIntent via REST API (no SDK)
    const intentParams = new URLSearchParams({
      amount: String(amountCents),
      currency: currency.toLowerCase(),
      "payment_method_types[]": "card",
      "metadata[subdomain]": subdomain,
      "metadata[email]": body.email ?? "",
    });

    const stripeRes = await fetch("https://api.stripe.com/v1/payment_intents", {
      method: "POST",
      headers: { Authorization: `Bearer ${stripeKey}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: intentParams.toString(),
    });

    const intent = await stripeRes.json() as { id?: string; client_secret?: string; error?: { message: string } };
    if (!stripeRes.ok || intent.error) {
      return NextResponse.json({ error: intent.error?.message ?? "Stripe error" }, { status: 502 });
    }

    // Persist order in DB with status=pending — webhook updates to paid
    let orderId: string | undefined;
    if (tenantId && intent.id) {
      try {
        const order = await svc.createOrder(tenantId, {
          customerEmail: body.email!,
          customerName: body.name,
          customerAddress: body.address,
          paymentIntentId: intent.id,
          currency,
          items: body.items.map(i => ({
            productId: i.id,
            productName: i.name,
            variantName: i.variantName,
            sku: i.sku,
            quantity: i.quantity,
            unitPrice: i.price,
          })),
        });
        orderId = order.id;
      } catch {
        // Non-fatal — payment still proceeds even if order persistence fails
      }
    }

    return NextResponse.json({
      client_secret: intent.client_secret,
      payment_intent_id: intent.id,
      order_id: orderId ?? null,
      amount: amountCents,
      currency: currency.toLowerCase(),
      subtotal,
      vat_pct: vatPct,
      vat_amount: vatAmount,
      shipping_fee: shippingFee,
      total,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
