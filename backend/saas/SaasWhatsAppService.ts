/**
 * SaasWhatsAppService — outbound WhatsApp via Twilio (WhatsApp Business API).
 * Requires: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_WHATSAPP
 * (e.g. TWILIO_FROM_WHATSAPP=whatsapp:+14155238886)
 *
 * Stores conversations in inbox_conversations (channel='whatsapp').
 * If credentials not set → throws SaasWhatsAppError with code NOT_CONFIGURED.
 */
import { DbClient } from "../db/DbClient";
import type { SaasPostgresPort } from "./SaasOnboardingService";

export class SaasWhatsAppError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = "SaasWhatsAppError";
  }
}

export type WhatsAppSendInput = {
  to: string;       // e164 phone e.g. +34612345678 (without whatsapp: prefix)
  body: string;
  contactId?: string | null;
};

export type WhatsAppMessage = {
  id: string;
  tenantId: string;
  conversationId: string;
  to: string;
  body: string;
  twilioSid: string | null;
  status: "sent" | "failed";
  contactId: string | null;
  createdAt: string;
};

export type WhatsAppConfig = {
  configured: boolean;
  fromNumber: string | null;
};

type MsgRow = {
  id: string; tenant_id: string; conversation_id: string | null;
  to_number: string; body: string; twilio_sid: string | null;
  status: string; contact_id: string | null; created_at: Date;
};

function rowToMsg(r: MsgRow): WhatsAppMessage {
  return {
    id: r.id, tenantId: r.tenant_id, conversationId: r.conversation_id ?? "",
    to: r.to_number, body: r.body, twilioSid: r.twilio_sid,
    status: r.status as "sent" | "failed",
    contactId: r.contact_id, createdAt: new Date(r.created_at).toISOString(),
  };
}

function getTwilioCreds(): { accountSid: string; authToken: string; fromWhatsApp: string } | null {
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const authToken  = process.env.TWILIO_AUTH_TOKEN?.trim();
  const fromNum    = process.env.TWILIO_FROM_WHATSAPP?.trim();
  if (!accountSid || !authToken || !fromNum) return null;
  const from = fromNum.startsWith("whatsapp:") ? fromNum : `whatsapp:${fromNum}`;
  return { accountSid, authToken, fromWhatsApp: from };
}

async function twilioWhatsAppSend(
  accountSid: string,
  authToken: string,
  from: string,
  to: string,
  body: string,
  fetchFn: typeof fetch = fetch,
): Promise<string> {
  const toAddr = to.startsWith("whatsapp:") ? to : `whatsapp:${to}`;
  const url = `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Messages.json`;
  const params = new URLSearchParams({ From: from, To: toAddr, Body: body });
  const res = await fetchFn(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
    },
    body: params.toString(),
  });
  const data = await res.json() as { sid?: string; message?: string; code?: number };
  if (!res.ok) throw new SaasWhatsAppError(`Twilio error: ${data.message ?? "unknown"}`, "API_ERROR");
  return data.sid ?? "";
}

export class SaasWhatsAppService {
  constructor(
    private readonly db: SaasPostgresPort = DbClient.getInstance(),
    private readonly fetchFn: typeof fetch = fetch,
  ) {}

  getConfig(): WhatsAppConfig {
    const creds = getTwilioCreds();
    return {
      configured: creds !== null,
      fromNumber: creds?.fromWhatsApp ?? null,
    };
  }

  async send(tenantId: string, input: WhatsAppSendInput): Promise<WhatsAppMessage> {
    if (!input.to.trim()) throw new SaasWhatsAppError("to is required", "VALIDATION");
    if (!input.body.trim()) throw new SaasWhatsAppError("body is required", "VALIDATION");

    const creds = getTwilioCreds();
    if (!creds) {
      throw new SaasWhatsAppError(
        "WhatsApp not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_WHATSAPP.",
        "NOT_CONFIGURED",
      );
    }

    // Ensure inbox conversation exists for this contact/number
    const convRows = await this.db.query<{ id: string }>(
      `SELECT id FROM conversations WHERE tenant_id=$1 AND channel='whatsapp'
       AND (metadata->>'wa_to' = $2 OR contact_id = $3) LIMIT 1`,
      [tenantId, input.to, input.contactId ?? ""],
    );
    let conversationId: string;
    if (convRows[0]) {
      conversationId = convRows[0].id;
    } else {
      const newConv = await this.db.query<{ id: string }>(
        `INSERT INTO conversations (tenant_id, contact_id, channel, status, last_message, last_message_at,
           updated_at, metadata)
         VALUES ($1,$2,'whatsapp','open',$3,NOW(),NOW(),$4::jsonb)
         RETURNING id`,
        [tenantId, input.contactId ?? null, input.body.slice(0, 120),
         JSON.stringify({ wa_to: input.to })],
      );
      conversationId = newConv[0].id;
    }

    let twilioSid: string | null = null;
    let status: "sent" | "failed" = "sent";
    try {
      twilioSid = await twilioWhatsAppSend(
        creds.accountSid, creds.authToken, creds.fromWhatsApp, input.to, input.body, this.fetchFn,
      );
    } catch {
      status = "failed";
    }

    // Store outbound message in saas_sms_log reusing the same pattern
    const rows = await this.db.query<MsgRow>(
      `INSERT INTO saas_sms_log (tenant_id, to_number, body, twilio_sid, status, created_at)
       VALUES ($1,$2,$3,$4,$5,NOW())
       RETURNING id, tenant_id, NULL::uuid AS conversation_id, to_number, body, twilio_sid, status,
                 NULL::uuid AS contact_id, created_at`,
      [tenantId, input.to, input.body, twilioSid, status],
    );

    // Update conversation last message
    await this.db.query(
      `UPDATE conversations SET last_message=$1, last_message_at=NOW(), updated_at=NOW() WHERE id=$2`,
      [input.body.slice(0, 120), conversationId],
    );

    if (!rows[0]) throw new SaasWhatsAppError("Failed to persist message", "DB_ERROR");
    const msg = rowToMsg(rows[0]);
    msg.conversationId = conversationId;
    msg.contactId = input.contactId ?? null;
    if (status === "failed") throw new SaasWhatsAppError("Message send failed (stored as failed)", "SEND_FAILED");
    return msg;
  }

  async listMessages(tenantId: string, opts?: { limit?: number }): Promise<WhatsAppMessage[]> {
    const limit = Math.min(opts?.limit ?? 50, 200);
    const rows = await this.db.query<MsgRow>(
      `SELECT id, tenant_id, NULL::uuid AS conversation_id, to_number, body, twilio_sid, status,
              NULL::uuid AS contact_id, created_at
       FROM saas_sms_log WHERE tenant_id=$1
       ORDER BY created_at DESC LIMIT $2`,
      [tenantId, limit],
    );
    return rows.map(rowToMsg);
  }
}

let _instance: SaasWhatsAppService | null = null;
export function getSaasWhatsAppService(): SaasWhatsAppService {
  if (!_instance) _instance = new SaasWhatsAppService();
  return _instance;
}
export function resetSaasWhatsAppServiceForTests(): void { _instance = null; }
