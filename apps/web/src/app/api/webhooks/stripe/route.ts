import { NextRequest, NextResponse } from "next/server";

import { DbClient } from "../../../../../../../backend/db/DbClient";
import { verifyStripeWebhook } from "../../../../../../../backend/stripe/webhookHandler";
import { handleStripeWebhook } from "../../../../../../../backend/stripe/webhookHandler";

export const dynamic = 'force-dynamic';
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signatureHeader = req.headers.get("stripe-signature") ?? "";
    const db = DbClient.getInstance();

    // Verify signature first (throws on invalid).
    const event = verifyStripeWebhook(rawBody, signatureHeader);
    const eventId = event.id;

    // Idempotency: skip already-processed events.
    try {
      const existing = await db.query<{ status: string }>(
        `SELECT status FROM stripe_webhook_events WHERE stripe_event_id = $1 LIMIT 1`,
        [eventId],
      );
      if (existing[0]?.status === "processed") {
        return NextResponse.json({ received: true, skipped: "duplicate" });
      }
    } catch {
      // Table may not exist yet during first deploy — proceed without idempotency check.
    }

    // Insert/claim the event row.
    try {
      await db.query(
        `INSERT INTO stripe_webhook_events (stripe_event_id, event_type, status, received_at)
         VALUES ($1, $2, 'processing', now())
         ON CONFLICT (stripe_event_id) DO UPDATE SET status = 'processing'
         WHERE stripe_webhook_events.status = 'received'`,
        [eventId, event.type],
      );
    } catch {
      // Non-fatal — proceed even if idempotency table is unavailable.
    }

    await handleStripeWebhook(rawBody, signatureHeader, db);

    // Mark processed.
    try {
      await db.query(
        `UPDATE stripe_webhook_events SET status = 'processed', processed_at = now()
         WHERE stripe_event_id = $1`,
        [eventId],
      );
    } catch {
      // Non-fatal.
    }

    return NextResponse.json({ received: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Webhook error";
    if (message.includes("signature") || message.includes("Invalid")) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }
    console.error("[stripe-webhook]", err);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
