import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getSaasStoreService } from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_SKEW_SEC = 300;

function timingSafeEqualHex(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a, "hex");
    const bb = Buffer.from(b, "hex");
    if (ba.length === 0 || ba.length !== bb.length) return false;
    return timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

/**
 * POST /api/webhooks/stripe-store
 * Handles payment_intent.succeeded → mark order paid (idempotent).
 * Verify using STRIPE_STORE_WEBHOOK_SECRET or STRIPE_WEBHOOK_SECRET.
 * Enforces ±5m timestamp skew and timing-safe HMAC compare.
 */
export async function POST(req: Request) {
  const webhookSecret = process.env.STRIPE_STORE_WEBHOOK_SECRET ?? process.env.STRIPE_WEBHOOK_SECRET;
  const sig = req.headers.get("stripe-signature");
  const rawBody = await req.text();

  // «No configurado» y «sin firma» NO son lo mismo, y confundirlos en un 401
  // tiene consecuencias en una ruta de pagos.
  //
  // Si falta el secreto el problema es NUESTRO: Stripe debe reintentar cuando se
  // resuelva, no descartar el evento. Con 401 agota su presupuesto de reintentos
  // y el evento de pago se pierde en silencio. Con 503 vuelve.
  //
  // La distincion ya estaba bien hecha en los otros dos sitios del repositorio
  // que verifican webhooks de Stripe: `backend/routers/os_store_builder.py`
  // devuelve 503 con ese razonamiento escrito, y la ruta general
  // `/api/webhooks/stripe` responde «Stripe not configured» con 503. Esta era la
  // unica que los fundia.
  if (!webhookSecret?.trim()) {
    return NextResponse.json(
      { error: "Webhook not configured", code: "WEBHOOK_NOT_CONFIGURED" },
      { status: 503 },
    );
  }
  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 401 });
  }

  try {
    const parts = sig.split(",").reduce<Record<string, string>>((acc, part) => {
      const [k, v] = part.split("=");
      if (k && v) acc[k] = v;
      return acc;
    }, {});
    const timestamp = parts["t"];
    const v1 = parts["v1"];
    if (!timestamp || !v1) throw new Error("invalid signature");

    const tsNum = Number(timestamp);
    if (!Number.isFinite(tsNum)) throw new Error("invalid timestamp");
    const skew = Math.abs(Math.floor(Date.now() / 1000) - tsNum);
    if (skew > MAX_SKEW_SEC) {
      return NextResponse.json({ error: "Timestamp outside tolerance" }, { status: 400 });
    }

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(webhookSecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const mac = await crypto.subtle.sign("HMAC", key, encoder.encode(`${timestamp}.${rawBody}`));
    const computed = Array.from(new Uint8Array(mac))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    if (!timingSafeEqualHex(computed, v1)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Signature verification failed" }, { status: 400 });
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
