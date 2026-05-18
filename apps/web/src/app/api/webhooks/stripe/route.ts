import { NextRequest, NextResponse } from "next/server";

import { DbClient } from "../../../../../../../backend/db/DbClient";
import { handleStripeWebhook } from "../../../../../../../backend/stripe/webhookHandler";

export const dynamic = 'force-dynamic';
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signatureHeader = req.headers.get("stripe-signature") ?? "";
    const db = DbClient.getInstance();
    await handleStripeWebhook(rawBody, signatureHeader, db);
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
