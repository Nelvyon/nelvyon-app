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
    tags?: Record<string, string[]>;
    commonHeaders?: { to?: string[] };
    destination?: string[];
  };
};

// Cache fetched certificates in-process to avoid hammering AWS on every request
const certCache = new Map<string, string>();

/**
 * URLs que de verdad sirve SNS. Anclada al principio y exigiendo la barra tras
 * el dominio: sin la barra, `https://sns.eu-west-1.amazonaws.com.atacante.test/`
 * y `...amazonaws.com@atacante.test/` pasarian.
 *
 * Se saca a constante porque el sobre trae DOS URLs —`SigningCertURL` y
 * `SubscribeURL`— y solo se comprobaba una. Son la misma clase de dato.
 */
const URL_DE_SNS = /^https:\/\/sns\.[a-z0-9-]+\.amazonaws\.com\//;

/**
 * Topics cuyas notificaciones se aceptan (lista separada por comas).
 *
 * Sin esto, verificar la firma no sirve para identificar al remitente: AWS firma
 * para todo el mundo, asi que cualquiera puede crear un topic en SU cuenta,
 * apuntarlo aqui, y sus mensajes traeran una firma autentica y un certificado
 * servido por AWS de verdad. Lo unico que separa el topic de NELVYON del de un
 * desconocido es el `TopicArn`, que va dentro de la cadena firmada.
 */
function topicsPermitidos(): string[] {
  return (process.env.SES_SNS_TOPIC_ARN ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

async function fetchCert(url: string): Promise<string> {
  if (certCache.has(url)) return certCache.get(url)!;
  if (!URL_DE_SNS.test(url)) {
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

function extractIds(mail: SesNotification["mail"]) {
  const headers = mail.headers ?? [];
  const tags = mail.tags ?? {};
  return {
    campaniaId:
      headers.find((h) => h.name === "X-Campania-Id")?.value ?? tags.campania_id?.[0] ?? null,
    contactId:
      headers.find((h) => h.name === "X-Recipient-Id")?.value ?? tags.contact_id?.[0] ?? null,
    tenantId: headers.find((h) => h.name === "X-Tenant-Id")?.value ?? tags.tenant_id?.[0] ?? null,
  };
}

async function markRecipientsBouncedByEmail(
  db: ReturnType<typeof DbClient.getInstance>,
  emails: string[],
  tenantId: string,
) {
  for (const email of emails) {
    await db.query(
      `UPDATE saas_campania_recipients scr SET status = 'bounced'
       FROM saas_contacts sc
       WHERE sc.id = scr.contact_id
         AND scr.tenant_id = $2::uuid
         AND sc.tenant_id = $2::uuid
         AND sc.email = $1`,
      [email, tenantId],
    );
  }
}

async function suppressContactsByEmail(
  db: ReturnType<typeof DbClient.getInstance>,
  emails: string[],
  tenantId: string,
) {
  for (const email of emails) {
    await db.query(
      `UPDATE saas_campania_recipients scr SET status = 'unsubscribed'
       FROM saas_contacts sc
       WHERE sc.id = scr.contact_id
         AND scr.tenant_id = $2::uuid
         AND sc.tenant_id = $2::uuid
         AND sc.email = $1`,
      [email, tenantId],
    );
    await db.query(
      `UPDATE saas_contacts SET tags = array(SELECT DISTINCT unnest(tags || ARRAY['unsubscribed'])), updated_at = NOW()
       WHERE tenant_id = $2::uuid AND email = $1`,
      [email, tenantId],
    );
  }
}

async function handleBounce(db: ReturnType<typeof DbClient.getInstance>, notification: SesNotification) {
  const emails = (notification.bounce?.bouncedRecipients ?? []).map((r) => r.emailAddress);
  const { campaniaId, contactId, tenantId } = extractIds(notification.mail);

  if (campaniaId && contactId && tenantId) {
    await db.query(
      `UPDATE saas_campania_recipients SET status = 'bounced'
       WHERE tenant_id = $1 AND campania_id = $2 AND contact_id = $3`,
      [tenantId, campaniaId, contactId],
    );
    await db.query(
      `UPDATE saas_campanias SET updated_at = NOW() WHERE tenant_id = $1 AND id = $2`,
      [tenantId, campaniaId],
    );
    return;
  }

  if (emails.length > 0 && tenantId) {
    await markRecipientsBouncedByEmail(db, emails, tenantId);
  }
}

async function handleComplaint(db: ReturnType<typeof DbClient.getInstance>, notification: SesNotification) {
  const { campaniaId, contactId, tenantId } = extractIds(notification.mail);

  if (campaniaId && contactId && tenantId) {
    await db.query(
      `UPDATE saas_campania_recipients SET status = 'unsubscribed'
       WHERE tenant_id = $1 AND campania_id = $2 AND contact_id = $3`,
      [tenantId, campaniaId, contactId],
    );
    await db.query(
      `UPDATE saas_contacts SET tags = array(SELECT DISTINCT unnest(tags || ARRAY['unsubscribed'])), updated_at = NOW()
       WHERE tenant_id = $1 AND id = $2`,
      [tenantId, contactId],
    );
    return;
  }

  const emails = (notification.complaint?.complainedRecipients ?? []).map((r) => r.emailAddress);
  if (emails.length > 0 && tenantId) {
    await suppressContactsByEmail(db, emails, tenantId);
  }
}

async function handleDelivery(db: ReturnType<typeof DbClient.getInstance>, notification: SesNotification) {
  const { campaniaId, contactId, tenantId } = extractIds(notification.mail);
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

  const enProduccion = process.env.NODE_ENV === "production";

  // La firma dice que el mensaje viene de AWS. NO dice de quien: eso lo dice el
  // topic, y hay que compararlo con el nuestro.
  const permitidos = topicsPermitidos();
  if (permitidos.length === 0) {
    if (enProduccion) {
      // Cierre en falso y visible, como en la ruta hermana de WhatsApp. Callar
      // aqui seria aceptar notificaciones de cualquier cuenta de AWS del mundo.
      return NextResponse.json(
        { error: "SES_SNS_TOPIC_ARN required in production" },
        { status: 503 },
      );
    }
  } else if (!permitidos.includes(envelope.TopicArn)) {
    return NextResponse.json({ error: "Untrusted TopicArn" }, { status: 403 });
  }

  // El interruptor de pruebas no puede alcanzar produccion. Antes no miraba el
  // entorno: una variable heredada de un fichero de pruebas dejaba el webhook
  // abierto de par en par sin que nada lo delatara.
  if (enProduccion || process.env.SKIP_SNS_VERIFY !== "true") {
    const valid = await verifySnsSignature(envelope).catch(() => false);
    if (!valid) {
      return NextResponse.json({ error: "Invalid SNS signature" }, { status: 403 });
    }
  }

  // Auto-confirm SNS subscription
  if (envelope.Type === "SubscriptionConfirmation" && envelope.SubscribeURL) {
    if (!URL_DE_SNS.test(envelope.SubscribeURL)) {
      return NextResponse.json({ error: "Untrusted SubscribeURL" }, { status: 403 });
    }
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
