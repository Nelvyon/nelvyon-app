import { NextRequest, NextResponse } from "next/server";

import { DbClient } from "../../../../../../../backend/db/DbClient";
import { verifyStripeWebhook, processStripeEvent } from "../../../../../../../backend/stripe/webhookHandler";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const db = DbClient.getInstance();
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
           WHERE stripe_webhook_events.status NOT IN ('processed', 'processing')
         RETURNING status`,
        [eventId, event.type],
      );
      if (!claimed[0]) {
        return NextResponse.json({ received: true, skipped: "duplicate" });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!/stripe_webhook_events/i.test(msg) || !/does not exist|relation/i.test(msg)) {
        console.error("[stripe-webhook] idempotency claim failed", err);
        return NextResponse.json({ error: "Idempotency check failed" }, { status: 503 });
      }
      console.warn("[stripe-webhook] idempotency table missing — proceeding without claim");
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
