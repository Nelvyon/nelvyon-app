import { NextResponse } from "next/server";

import { getSaasMembershipService } from "@nelvyon/saas";
import { verifyStripeWebhook } from "../../../../../../../backend/stripe/webhookHandler";
import { suscripcionDelEvento } from "./suscripcionDelEvento";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/webhooks/stripe-membership
 *
 * Los eventos de suscripción de las membresías. Exige firma de Stripe.
 *
 * EL CONTRATO, RECONSTRUIDO
 * =========================
 *   customer.subscription.created    ->  active     (alta)
 *   invoice.payment_succeeded        ->  active     (SOLO desde `expired`)
 *   invoice.payment_failed           ->  expired    (se le cayó el cobro)
 *   customer.subscription.deleted    ->  cancelled  (terminal)
 *
 * DOS DEFECTOS QUE CIERRA
 * =======================
 *
 * 1 · EL IDENTIFICADOR DE LOS EVENTOS DE FACTURA ERA EL EQUIVOCADO
 *
 * `event.data.object` es un objeto distinto según el evento. En
 * `customer.subscription.*` es una Suscripción y su `id` es `sub_…`. En
 * `invoice.*` es una **Factura**, y su `id` es `in_…`.
 *
 * La versión anterior leía `obj.id` para todos por igual, así que
 * `invoice.payment_failed` buscaba un miembro cuyo `stripe_subscription_id`
 * fuera `in_…`. **No coincidía nunca.** Es decir: la caducidad por impago no
 * caducaba a nadie, y no fallaba al hacerlo — el `UPDATE` afectaba a cero filas
 * y la ruta devolvía `200 OK`.
 *
 * Y lo mismo con el inquilino: la metadata vive en la suscripción, no en la
 * factura que genera, así que `metadata.tenant_id` venía vacío y la petición se
 * descartaba antes incluso de llegar al servicio.
 *
 * 2 · QUIEN CADUCABA POR IMPAGO NO VOLVÍA NUNCA
 *
 * El único evento que llevaba a `active` era `customer.subscription.created`, y
 * ése se emite UNA vez, al crear la suscripción. Alguien cuyo cobro fallara un
 * mes quedaba en `expired` para siempre, aunque pagara al día siguiente: Stripe
 * cobraba y NELVYON seguía cerrado.
 *
 * No se recupera el comportamiento accidental de antes —que un `created`
 * reentregado devolviera a `active`—, porque eso era el agujero: un `created`
 * que llega tarde no es noticia de un pago, es la reentrega de un evento viejo.
 * Lo que reactiva es `invoice.payment_succeeded`, que sí significa que acaba de
 * entrar dinero.
 *
 * LO QUE SIGUE SIENDO UNA DECISIÓN DE PRODUCTO
 * ============================================
 * Que una baja EXPLÍCITA (`cancelled`) no revive con un pago posterior. Está
 * escrito así a propósito y es la dirección que cierra: si alguien pagó y no
 * entra, llama; si alguien que se dio de baja entra, no llama nadie.
 */

/** Los eventos que se tratan. Lo que no está aquí, no toca nada. */
const EVENTOS = new Set([
  "customer.subscription.created",
  "customer.subscription.deleted",
  "invoice.payment_failed",
  "invoice.payment_succeeded",
]);

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signatureHeader = req.headers.get("stripe-signature") ?? "";
    const event = verifyStripeWebhook(rawBody, signatureHeader);

    if (!EVENTOS.has(event.type)) {
      return NextResponse.json({ ok: true, ignored: event.type });
    }

    const obj = (event.data?.object ?? {}) as unknown as Record<string, unknown>;
    const stripeSubId = suscripcionDelEvento(event.type, obj);
    if (!stripeSubId) {
      return NextResponse.json({ ok: true, skipped: "sin suscripcion" });
    }

    const svc = getSaasMembershipService();

    // El inquilino, de la metadata si viene y de la base si no.
    //
    // Las facturas no llevan `metadata.tenant_id` —la metadata vive en la
    // suscripción—, así que exigirlo dejaba fuera a la mitad de los eventos.
    let tenantId = String(
      (obj.metadata as Record<string, unknown> | undefined)?.tenant_id ?? "",
    );
    if (!tenantId) {
      tenantId = (await svc.inquilinoDeLaSuscripcion(stripeSubId)) ?? "";
    }
    if (!tenantId) {
      // No se conoce esa suscripción. Se acepta el evento —para que Stripe no lo
      // reintente eternamente— y no se toca nada.
      return NextResponse.json({ ok: true, skipped: "suscripcion desconocida" });
    }

    if (event.type === "customer.subscription.created") {
      await svc.updateMemberStatus(tenantId, stripeSubId, "active");
    } else if (event.type === "invoice.payment_succeeded") {
      // Sólo levanta desde `expired`. Una baja explícita no revive con un cobro.
      await svc.reactivarPorPago(tenantId, stripeSubId);
    } else if (event.type === "customer.subscription.deleted") {
      await svc.updateMemberStatus(tenantId, stripeSubId, "cancelled");
    } else if (event.type === "invoice.payment_failed") {
      await svc.updateMemberStatus(tenantId, stripeSubId, "expired");
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
