/**
 * SES → SNS webhook for bounce, complaint, and delivery notifications.
 * Configure in AWS SNS: HTTP/S endpoint → POST to /api/webhooks/ses
 * SNS will send a SubscriptionConfirmation first — we auto-confirm it.
 */
import { NextResponse } from "next/server";
import { DbClient } from "@/../../backend/db/DbClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SnsEnvelope = {
  Type: "SubscriptionConfirmation" | "Notification" | "UnsubscribeConfirmation";
  SubscribeURL?: string;
  Message: string;
};

type SesNotification = {
  notificationType: "Bounce" | "Complaint" | "Delivery";
  bounce?: { bouncedRecipients: Array<{ emailAddress: string }> };
  complaint?: { complainedRecipients: Array<{ emailAddress: string }> };
  delivery?: { recipients: string[] };
  mail: { headers?: Array<{ name: string; value: string }> };
};

function extractCampaniaRecipientToken(headers: Array<{ name: string; value: string }>) {
  // We embed X-Campania-Id and X-Recipient-Id in email headers for traceability
  const campaniaId = headers.find((h) => h.name === "X-Campania-Id")?.value ?? null;
  const contactId = headers.find((h) => h.name === "X-Recipient-Id")?.value ?? null;
  const tenantId = headers.find((h) => h.name === "X-Tenant-Id")?.value ?? null;
  return { campaniaId, contactId, tenantId };
}

export async function POST(req: Request): Promise<NextResponse> {
  const body = await req.text();
  let envelope: SnsEnvelope;
  try {
    envelope = JSON.parse(body) as SnsEnvelope;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Auto-confirm SNS subscription
  if (envelope.Type === "SubscriptionConfirmation" && envelope.SubscribeURL) {
    await fetch(envelope.SubscribeURL);
    return NextResponse.json({ ok: true, confirmed: true });
  }

  if (envelope.Type !== "Notification") {
    return NextResponse.json({ ok: true });
  }

  let notification: SesNotification;
  try {
    notification = JSON.parse(envelope.Message) as SesNotification;
  } catch {
    return NextResponse.json({ error: "Invalid SES message" }, { status: 400 });
  }

  const db = DbClient.getInstance();
  const headers = notification.mail.headers ?? [];
  const { campaniaId, contactId, tenantId } = extractCampaniaRecipientToken(headers);

  if (notification.notificationType === "Bounce") {
    const emails = (notification.bounce?.bouncedRecipients ?? []).map((r) => r.emailAddress);
    if (campaniaId && contactId && tenantId) {
      await db.query(
        `UPDATE saas_campania_recipients
         SET status = 'bounced'
         WHERE tenant_id = $1 AND campania_id = $2 AND contact_id = $3`,
        [tenantId, campaniaId, contactId],
      );
    } else {
      // Fall back to email matching across all recipients
      for (const email of emails) {
        await db.query(
          `UPDATE saas_campania_recipients scr
           SET status = 'bounced'
           FROM saas_contacts sc
           WHERE sc.id = scr.contact_id AND sc.email = $1`,
          [email],
        );
      }
    }
  } else if (notification.notificationType === "Complaint") {
    const emails = (notification.complaint?.complainedRecipients ?? []).map((r) => r.emailAddress);
    for (const email of emails) {
      await db.query(
        `UPDATE saas_campania_recipients scr
         SET status = 'unsubscribed'
         FROM saas_contacts sc
         WHERE sc.id = scr.contact_id AND sc.email = $1`,
        [email],
      );
    }
  } else if (notification.notificationType === "Delivery") {
    if (campaniaId && contactId && tenantId) {
      await db.query(
        `UPDATE saas_campania_recipients
         SET status = 'sent', sent_at = COALESCE(sent_at, NOW())
         WHERE tenant_id = $1 AND campania_id = $2 AND contact_id = $3 AND status = 'pending'`,
        [tenantId, campaniaId, contactId],
      );
    }
  }

  return NextResponse.json({ ok: true, type: notification.notificationType });
}
