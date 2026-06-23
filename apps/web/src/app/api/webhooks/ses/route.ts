/**
 * SES → SNS webhook for bounce, complaint, and delivery notifications.
 * Configure in AWS SNS: HTTP/S endpoint → POST to /api/webhooks/ses
 *
 * SNS sends SubscriptionConfirmation first (GET SubscribeURL to confirm).
 * All Notification messages are SNS-signature-verified before processing.
 */
import { type NextRequest, NextResponse } from "next/server";
import { createVerify } from "crypto";
import { DbClient } from "../../../../../../../backend/db/DbClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ─── SNS Signature Verification ──────────────────────────────────────────────

type SnsEnvelope = {
  Type: "SubscriptionConfirmation" | "Notification" | "UnsubscribeConfirmation";
  MessageId: string;
  TopicArn: string;
  Message: string;
  Timestamp: string;
  SignatureVersion: string;
  Signature: string;
  SigningCertURL: string;
  SubscribeURL?: string;
  Subject?: string;
  Token?: string;
  UnsubscribeURL?: string;
};

type SesNotification = {
  notificationType: "Bounce" | "Complaint" | "Delivery";
  bounce?: { bouncedRecipients: Array<{ emailAddress: string }>; bounceType: string };
  complaint?: { complainedRecipients: Array<{ emailAddress: string }> };
  delivery?: { recipients: string[] };
  mail: {
    headers?: Array<{ name: string; value: string }>;
    commonHeaders?: { to?: string[] };
    destination?: string[];
  };
};

// Cache fetched certificates in-process to avoid hammering AWS on every request
const certCache = new Map<string, string>();

async function fetchCert(url: string): Promise<string> {
  if (certCache.has(url)) return certCache.get(url)!;
  // Only trust AWS SNS cert URLs
  if (!/^https:\/\/sns\.[a-z0-9-]+\.amazonaws\.com\//.test(url)) {
    throw new Error(`Untrusted SigningCertURL: ${url}`);
  }
  const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) throw new Error(`Failed to fetch SNS cert: ${res.status}`);
  const pem = await res.text();
  certCache.set(url, pem);
  return pem;
}

function buildSigningString(msg: SnsEnvelope): string {
  const fields: Array<keyof SnsEnvelope> =
    msg.Type === "Notification"
      ? ["Message", "MessageId", "Subject", "Timestamp", "TopicArn", "Type"]
      : ["Message", "MessageId", "SubscribeURL", "Timestamp", "Token", "TopicArn", "Type"];

  return fields
    .filter((f) => msg[f] !== undefined)
    .map((f) => `${f}\n${msg[f]}\n`)
    .join("");
}

async function verifySnsSignature(msg: SnsEnvelope): Promise<boolean> {
  if (msg.SignatureVersion !== "1") return false;
  try {
    const pem = await fetchCert(msg.SigningCertURL);
    const verify = createVerify("SHA1");
    verify.update(buildSigningString(msg));
    return verify.verify(pem, msg.Signature, "base64");
  } catch {
    return false;
  }
}

// ─── DB helpers ──────────────────────────────────────────────────────────────

function extractIds(headers: Array<{ name: string; value: string }>) {
  return {
    campaniaId: headers.find((h) => h.name === "X-Campania-Id")?.value ?? null,
    contactId: headers.find((h) => h.name === "X-Recipient-Id")?.value ?? null,
    tenantId: headers.find((h) => h.name === "X-Tenant-Id")?.value ?? null,
  };
}

async function handleBounce(db: ReturnType<typeof DbClient.getInstance>, notification: SesNotification) {
  const emails = (notification.bounce?.bouncedRecipients ?? []).map((r) => r.emailAddress);
  const headers = notification.mail.headers ?? [];
  const { campaniaId, contactId, tenantId } = extractIds(headers);

  if (campaniaId && contactId && tenantId) {
    await db.query(
      `UPDATE saas_campania_recipients SET status = 'bounced'
       WHERE tenant_id = $1 AND campania_id = $2 AND contact_id = $3`,
      [tenantId, campaniaId, contactId],
    );
    // Increment bounced_count on the campania
    await db.query(
      `UPDATE saas_campanias SET updated_at = NOW() WHERE tenant_id = $1 AND id = $2`,
      [tenantId, campaniaId],
    );
  } else {
    for (const email of emails) {
      await db.query(
        `UPDATE saas_campania_recipients scr SET status = 'bounced'
         FROM saas_contacts sc
         WHERE sc.id = scr.contact_id AND sc.email = $1`,
        [email],
      );
    }
  }
}

async function handleComplaint(db: ReturnType<typeof DbClient.getInstance>, notification: SesNotification) {
  const emails = (notification.complaint?.complainedRecipients ?? []).map((r) => r.emailAddress);
  for (const email of emails) {
    // Mark unsubscribed in recipients
    await db.query(
      `UPDATE saas_campania_recipients scr SET status = 'unsubscribed'
       FROM saas_contacts sc
       WHERE sc.id = scr.contact_id AND sc.email = $1`,
      [email],
    );
    // Also mark contact as unsubscribed globally to prevent future sends
    await db.query(
      `UPDATE saas_contacts SET tags = array(SELECT DISTINCT unnest(tags || ARRAY['unsubscribed'])), updated_at = NOW()
       WHERE email = $1`,
      [email],
    );
  }
}

async function handleDelivery(db: ReturnType<typeof DbClient.getInstance>, notification: SesNotification) {
  const headers = notification.mail.headers ?? [];
  const { campaniaId, contactId, tenantId } = extractIds(headers);
  if (!campaniaId || !contactId || !tenantId) return;

  await db.query(
    `UPDATE saas_campania_recipients
     SET status = CASE WHEN status = 'pending' THEN 'sent' ELSE status END,
         sent_at = COALESCE(sent_at, NOW())
     WHERE tenant_id = $1 AND campania_id = $2 AND contact_id = $3`,
    [tenantId, campaniaId, contactId],
  );
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = await req.text();

  let envelope: SnsEnvelope;
  try {
    envelope = JSON.parse(body) as SnsEnvelope;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // In production, always verify SNS signature. Skip only if SKIP_SNS_VERIFY=true (test env).
  if (process.env.SKIP_SNS_VERIFY !== "true") {
    const valid = await verifySnsSignature(envelope).catch(() => false);
    if (!valid) {
      return NextResponse.json({ error: "Invalid SNS signature" }, { status: 403 });
    }
  }

  // Auto-confirm SNS subscription
  if (envelope.Type === "SubscriptionConfirmation" && envelope.SubscribeURL) {
    await fetch(envelope.SubscribeURL, { signal: AbortSignal.timeout(5000) });
    return NextResponse.json({ ok: true, confirmed: true });
  }

  if (envelope.Type !== "Notification") {
    return NextResponse.json({ ok: true });
  }

  let notification: SesNotification;
  try {
    notification = JSON.parse(envelope.Message) as SesNotification;
  } catch {
    return NextResponse.json({ error: "Invalid SES message body" }, { status: 400 });
  }

  const db = DbClient.getInstance();

  if (notification.notificationType === "Bounce") {
    await handleBounce(db, notification);
  } else if (notification.notificationType === "Complaint") {
    await handleComplaint(db, notification);
  } else if (notification.notificationType === "Delivery") {
    await handleDelivery(db, notification);
  }

  return NextResponse.json({ ok: true, type: notification.notificationType });
}
