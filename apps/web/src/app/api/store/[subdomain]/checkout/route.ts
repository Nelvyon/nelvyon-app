import { NextResponse } from "next/server";
import { getSaasStoreService } from "@nelvyon/saas";
import { DbClient } from "@/../../backend/db/DbClient";
import { EXTERNAL_FETCH_TIMEOUT_MS } from "@/../../backend/http/fetchWithTimeout";

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

    const tenantId = await resolveTenantId(subdomain);
    if (!tenantId) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    const svc = getSaasStoreService();
    const settings = await svc.getSettings(tenantId);
    const vatPct = settings?.vatPct ?? 21;
    const vatIncluded = settings?.vatIncluded ?? true;
    const shippingFee = settings?.shippingFee ?? 0;
    const currency = settings?.currency ?? "EUR";

    const resolvedItems: Array<{
      productId: string;
      productName: string;
      variantName?: string;
      sku?: string;
      quantity: number;
      unitPrice: number;
    }> = [];

    for (const item of body.items) {
      const qty = Math.max(1, Math.min(99, Math.floor(Number(item.quantity) || 1)));
      if (!item.id?.trim()) {
        return NextResponse.json({ error: "Each cart item must include product id" }, { status: 400 });
      }
      let product;
      try {
        product = await svc.getStoreProduct(tenantId, item.id.trim());
      } catch {
        return NextResponse.json({ error: `Product not found: ${item.id}` }, { status: 400 });
      }
      if (!product.active) {
        return NextResponse.json({ error: `Product unavailable: ${product.name}` }, { status: 400 });
      }
      let unitPrice = product.price;
      const variantName = item.variantName?.trim();
      if (variantName && product.variants?.length) {
        const variant = product.variants.find((v) => v.name === variantName);
        if (!variant) {
          return NextResponse.json({ error: `Variant not found: ${variantName}` }, { status: 400 });
        }
        unitPrice += variant.priceModifier;
      }
      resolvedItems.push({
        productId: product.id,
        productName: product.name,
        variantName: variantName || undefined,
        sku: product.sku ?? item.sku,
        quantity: qty,
        unitPrice,
      });
    }

    const subtotal = resolvedItems.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
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
      signal: AbortSignal.timeout(EXTERNAL_FETCH_TIMEOUT_MS),
    });

    const intent = await stripeRes.json() as { id?: string; client_secret?: string; error?: { message: string } };
    if (!stripeRes.ok || intent.error) {
      return NextResponse.json({ error: intent.error?.message ?? "Stripe error" }, { status: 502 });
    }

    // Persist order in DB with status=pending — webhook updates to paid
    let orderId: string | undefined;
    if (intent.id) {
      try {
        const order = await svc.createOrder(tenantId, {
          customerEmail: body.email!,
          customerName: body.name,
          customerAddress: body.address,
          paymentIntentId: intent.id,
          currency,
          items: resolvedItems.map((i) => ({
            productId: i.productId,
            productName: i.productName,
            variantName: i.variantName,
            sku: i.sku,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
          })),
        });
        orderId = order.id;
      } catch (e) {
        console.error("[store/checkout] order persistence failed", e);
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
