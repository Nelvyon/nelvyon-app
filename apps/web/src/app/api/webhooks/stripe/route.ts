import { NextRequest, NextResponse } from "next/server";

// CONEXION ENTRE INQUILINOS, no la de la peticion.
//
// El inquilino de un evento de Stripe sale del cuerpo FIRMADO por el proveedor,
// no de una sesion: esta ruta esta declarada sin contexto de inquilino a
// proposito. Tras el cutover a `nelvyon_web_app` las politicas filtrarian fila
// a fila y este webhook NO daria error: registraria el cobro sobre CERO FILAS.
// Un pago que se cobra y no se refleja es la averia mas cara del sistema.
//
// SE COMPROBO ANTES DE MIGRARLA, y no es una formalidad: con `nelvyon_web_jobs`
// no hay red debajo, el aislamiento lo pone cada `WHERE`. Las 36 consultas de
// la cadena de cobro —ruta, manejador, dunning, cancelacion e idioma— acotan
// todas por `user_id` o `tenant_id`. Lo fija
// `test_la_cadena_de_stripe_acota_por_inquilino`.
//
// Lo que bloqueaba esta migracion no era el aislamiento: era que el TIPO
// `DbJobsClient` se propagaba por toda la cadena. Se resolvio declarando la forma
// que de verdad se usa (`ConexionSql`), no ensanchando a una union.
import { DbJobsClient } from "../../../../../../../backend/db/DbJobsClient";
import { verifyStripeWebhook, processStripeEvent } from "../../../../../../../backend/stripe/webhookHandler";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const db = DbJobsClient.getInstance();
  let eventId: string | undefined;

  try {
    const rawBody = await req.text();
    const signatureHeader = req.headers.get("stripe-signature") ?? "";

    const event = verifyStripeWebhook(rawBody, signatureHeader);
    eventId = event.id;

    try {
      const claimed = await db.query<{ status: string }>(
        `INSERT INTO stripe_webhook_events (stripe_event_id, event_type, status, received_at)
         VALUES ($1, $2, 'processing', now())
         ON CONFLICT (stripe_event_id) DO UPDATE
           SET event_type = EXCLUDED.event_type, received_at = now()
           WHERE stripe_webhook_events.status NOT IN ('processed')
             AND (
               stripe_webhook_events.status <> 'processing'
               OR stripe_webhook_events.received_at < NOW() - INTERVAL '10 minutes'
             )
         RETURNING status`,
        [eventId, event.type],
      );
      if (!claimed[0]) {
        return NextResponse.json({ received: true, skipped: "duplicate" });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[stripe-webhook] idempotency claim failed", err);
      if (/stripe_webhook_events/i.test(msg) && /does not exist|relation/i.test(msg)) {
        return NextResponse.json({ error: "Idempotency table unavailable" }, { status: 503 });
      }
      return NextResponse.json({ error: "Idempotency check failed" }, { status: 503 });
    }

    await processStripeEvent(event, db);

    try {
      await db.query(
        `UPDATE stripe_webhook_events
         SET status = 'processed', processed_at = now(), error_message = NULL
         WHERE stripe_event_id = $1`,
        [eventId],
      );
    } catch {
      // Non-fatal.
    }

    return NextResponse.json({ received: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Webhook error";

    if (eventId) {
      try {
        await db.query(
          `UPDATE stripe_webhook_events
           SET status = 'received', error_message = $2
           WHERE stripe_event_id = $1 AND status <> 'processed'`,
          [eventId, message.slice(0, 500)],
        );
      } catch {
        // Non-fatal.
      }
    }

    if (message.includes("signature") || message.includes("Invalid") || message.includes("STRIPE_WEBHOOK_SECRET")) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }
    if (message.includes("STRIPE_SECRET_KEY")) {
      return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
    }

    console.error("[stripe-webhook]", err);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
