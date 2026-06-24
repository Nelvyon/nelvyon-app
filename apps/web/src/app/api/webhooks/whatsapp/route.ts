/**
 * POST /api/webhooks/whatsapp — Meta WhatsApp Cloud API webhook
 *
 * GET  — webhook verification challenge (Meta sends hub.challenge)
 * POST — inbound messages, status updates
 *
 * Env: META_WA_VERIFY_TOKEN (required for GET), META_WA_APP_SECRET (optional HMAC)
 */
import { NextResponse } from "next/server";
import { createHmac } from "crypto";
import {
  getSaasWhatsAppCloudService,
  getMetaVerifyToken,
  type InboundWaMessage,
} from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET — Meta webhook subscription verification */
export function GET(req: Request): NextResponse {
  const url = new URL(req.url);
  const mode      = url.searchParams.get("hub.mode");
  const token     = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  const verifyToken = getMetaVerifyToken();
  if (!verifyToken) {
    return NextResponse.json({ error: "META_WA_VERIFY_TOKEN not set" }, { status: 503 });
  }
  if (mode === "subscribe" && token === verifyToken && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}

/** POST — inbound messages and status updates from Meta */
export async function POST(req: Request): Promise<NextResponse> {
  // Optional HMAC signature verification
  const appSecret = process.env.META_WA_APP_SECRET?.trim();
  if (appSecret) {
    const signature = req.headers.get("x-hub-signature-256") ?? "";
    const rawBody = await req.text();
    const expected = "sha256=" + createHmac("sha256", appSecret).update(rawBody).digest("hex");
    if (signature !== expected) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
    // Re-parse since we consumed the body
    let body: unknown;
    try { body = JSON.parse(rawBody); } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    return processWebhookBody(body);
  }

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  return processWebhookBody(body);
}

type MetaEntry = {
  id?: string;
  changes?: Array<{
    value?: {
      messages?: Array<{
        from?: string;
        id?: string;
        timestamp?: string;
        type?: string;
        text?: { body?: string };
        contacts?: Array<{ wa_id?: string }>;
      }>;
      statuses?: unknown[];
    };
    field?: string;
  }>;
};

async function processWebhookBody(body: unknown): Promise<NextResponse> {
  const payload = body as { object?: string; entry?: MetaEntry[] };
  if (payload.object !== "whatsapp_business_account") {
    // Not a WhatsApp event — acknowledge silently
    return NextResponse.json({ ok: true });
  }

  const svc = getSaasWhatsAppCloudService();
  const TENANT_ID = process.env.DEFAULT_TENANT_ID ?? "default";

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== "messages") continue;
      for (const msg of change.value?.messages ?? []) {
        if (msg.type !== "text" || !msg.from || !msg.id || !msg.text?.body) continue;
        const inbound: InboundWaMessage = {
          from: msg.from,
          waId: msg.contacts?.[0]?.wa_id ?? msg.from,
          wamid: msg.id,
          body: msg.text.body,
          timestamp: parseInt(msg.timestamp ?? "0", 10),
        };
        await svc.processInbound(TENANT_ID, inbound).catch(() => null);
      }
    }
  }

  return NextResponse.json({ ok: true });
}
