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
      const existing = await db.query<{ status: string }>(
        `SELECT status FROM stripe_webhook_events WHERE stripe_event_id = $1 LIMIT 1`,
        [eventId],
      );
      if (existing[0]?.status === "processed") {
        return NextResponse.json({ received: true, skipped: "duplicate" });
      }
    } catch {
      // Table may not exist on first deploy — proceed.
    }

    try {
      await db.query(
        `INSERT INTO stripe_webhook_events (stripe_event_id, event_type, status, received_at)
         VALUES ($1, $2, 'processing', now())
         ON CONFLICT (stripe_event_id) DO UPDATE
           SET status = 'processing', event_type = EXCLUDED.event_type
         WHERE stripe_webhook_events.status <> 'processed'`,
        [eventId, event.type],
      );
    } catch (err) {
      console.error("[stripe-webhook] idempotency insert failed", err);
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
