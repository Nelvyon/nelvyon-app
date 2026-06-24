/**
 * SaasWhatsAppCloudService — WhatsApp Business Cloud API (Meta Graph API).
 *
 * Requires env vars:
 *   META_WA_PHONE_NUMBER_ID   — phone number ID from Meta developer portal
 *   META_WA_ACCESS_TOKEN      — permanent system user access token
 *   META_WA_VERIFY_TOKEN      — arbitrary secret for webhook challenge verification
 *   META_WA_APP_SECRET        — app secret for signature verification (optional but recommended)
 *
 * Twilio remains as fallback when Meta env vars are absent.
 * Priority: Cloud API first → Twilio fallback → NOT_CONFIGURED error.
 */
import { DbClient } from "../db/DbClient";
import type { SaasPostgresPort } from "./SaasOnboardingService";

export class SaasWhatsAppCloudError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = "SaasWhatsAppCloudError";
  }
}

export type CloudWaConfig = {
  configured: boolean;
  phoneNumberId: string | null;
  provider: "meta" | "twilio" | null;
};

export type CloudWaSendInput = {
  to: string;         // e164 without whatsapp: prefix
  body: string;
  templateName?: string;
  templateLanguage?: string;
  contactId?: string | null;
};

export type CloudWaMessage = {
  id: string;
  tenantId: string;
  conversationId: string;
  to: string;
  body: string;
  metaWamid: string | null;
  status: "sent" | "failed";
  contactId: string | null;
  createdAt: string;
};

export type InboundWaMessage = {
  from: string;           // e164 phone number
  waId: string;           // WhatsApp ID
  wamid: string;          // message ID from Meta
  body: string;
  timestamp: number;
};

type MsgRow = {
  id: string; tenant_id: string; conversation_id: string | null;
  to_number: string; body: string; twilio_sid: string | null;
  status: string; contact_id: string | null; created_at: Date;
};

function getMetaCreds(): { phoneNumberId: string; accessToken: string } | null {
  const phoneNumberId = process.env.META_WA_PHONE_NUMBER_ID?.trim();
  const accessToken   = process.env.META_WA_ACCESS_TOKEN?.trim();
  if (!phoneNumberId || !accessToken) return null;
  return { phoneNumberId, accessToken };
}

export function getMetaVerifyToken(): string | null {
  const t = process.env.META_WA_VERIFY_TOKEN?.trim();
  return t || null;
}

export function isMetaWaConfigured(): boolean {
  return getMetaCreds() !== null;
}

async function metaSend(
  phoneNumberId: string,
  accessToken: string,
  to: string,
  body: string,
  fetchFn: typeof fetch = fetch,
): Promise<string> {
  const url = `https://graph.facebook.com/v19.0/${encodeURIComponent(phoneNumberId)}/messages`;
  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: to.replace(/^\+/, ""),
    type: "text",
    text: { preview_url: false, body },
  };
  const res = await fetchFn(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json() as { messages?: Array<{ id: string }>; error?: { message: string } };
  if (!res.ok || data.error) {
    throw new SaasWhatsAppCloudError(
      `Meta Cloud API error: ${data.error?.message ?? "unknown"}`,
      "API_ERROR",
    );
  }
  return data.messages?.[0]?.id ?? "";
}

async function metaSendTemplate(
  phoneNumberId: string,
  accessToken: string,
  to: string,
  templateName: string,
  language: string,
  fetchFn: typeof fetch = fetch,
): Promise<string> {
  const url = `https://graph.facebook.com/v19.0/${encodeURIComponent(phoneNumberId)}/messages`;
  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: to.replace(/^\+/, ""),
    type: "template",
    template: {
      name: templateName,
      language: { code: language },
    },
  };
  const res = await fetchFn(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json() as { messages?: Array<{ id: string }>; error?: { message: string } };
  if (!res.ok || data.error) {
    throw new SaasWhatsAppCloudError(
      `Meta Cloud API template error: ${data.error?.message ?? "unknown"}`,
      "API_ERROR",
    );
  }
  return data.messages?.[0]?.id ?? "";
}

export class SaasWhatsAppCloudService {
  constructor(
    private readonly db: SaasPostgresPort = DbClient.getInstance(),
    private readonly fetchFn: typeof fetch = fetch,
  ) {}

  getConfig(): CloudWaConfig {
    const creds = getMetaCreds();
    return {
      configured: creds !== null,
      phoneNumberId: creds?.phoneNumberId ?? null,
      provider: creds ? "meta" : null,
    };
  }

  /**
   * Send a text message via Meta Cloud API.
   * Falls through to SaasWhatsAppCloudError if not configured.
   */
  async send(tenantId: string, input: CloudWaSendInput): Promise<CloudWaMessage> {
    if (!input.to.trim()) throw new SaasWhatsAppCloudError("to is required", "VALIDATION");
    if (!input.body.trim() && !input.templateName) {
      throw new SaasWhatsAppCloudError("body or templateName is required", "VALIDATION");
    }

    const creds = getMetaCreds();
    if (!creds) {
      throw new SaasWhatsAppCloudError(
        "WhatsApp Cloud API not configured. Set META_WA_PHONE_NUMBER_ID and META_WA_ACCESS_TOKEN.",
        "NOT_CONFIGURED",
      );
    }

    // Upsert inbox conversation
    const convRows = await this.db.query<{ id: string }>(
      `SELECT id FROM conversations WHERE tenant_id=$1 AND channel='whatsapp'
       AND (metadata->>'wa_to' = $2 OR contact_id = $3) LIMIT 1`,
      [tenantId, input.to, input.contactId ?? ""],
    ).catch(() => [] as { id: string }[]);

    let conversationId: string;
    if (convRows[0]) {
      conversationId = convRows[0].id;
    } else {
      const snippet = (input.body || (input.templateName ?? "")).slice(0, 120);
      const newConv = await this.db.query<{ id: string }>(
        `INSERT INTO conversations
           (tenant_id, contact_id, channel, status, last_message, last_message_at, updated_at, metadata)
         VALUES ($1,$2,'whatsapp','open',$3,NOW(),NOW(),$4::jsonb)
         RETURNING id`,
        [tenantId, input.contactId ?? null, snippet, JSON.stringify({ wa_to: input.to })],
      );
      conversationId = newConv[0]?.id ?? "";
    }

    let wamid: string | null = null;
    let status: "sent" | "failed" = "sent";
    try {
      if (input.templateName) {
        wamid = await metaSendTemplate(
          creds.phoneNumberId, creds.accessToken,
          input.to, input.templateName, input.templateLanguage ?? "es",
          this.fetchFn,
        );
      } else {
        wamid = await metaSend(creds.phoneNumberId, creds.accessToken, input.to, input.body, this.fetchFn);
      }
    } catch {
      status = "failed";
    }

    const rows = await this.db.query<MsgRow>(
      `INSERT INTO saas_sms_log (tenant_id, to_number, body, twilio_sid, status, created_at)
       VALUES ($1,$2,$3,$4,$5,NOW())
       RETURNING id, tenant_id, NULL::uuid AS conversation_id, to_number, body,
                 twilio_sid, status, NULL::uuid AS contact_id, created_at`,
      [tenantId, input.to, input.body || `[template:${input.templateName ?? ""}]`, wamid, status],
    );

    if (conversationId) {
      const snippet = (input.body || (input.templateName ?? "")).slice(0, 120);
      await this.db.query(
        `UPDATE conversations SET last_message=$1, last_message_at=NOW(), updated_at=NOW() WHERE id=$2`,
        [snippet, conversationId],
      ).catch(() => null);
    }

    if (!rows[0]) throw new SaasWhatsAppCloudError("Failed to persist message", "DB_ERROR");
    const r = rows[0];
    const msg: CloudWaMessage = {
      id: r.id, tenantId: r.tenant_id,
      conversationId, to: r.to_number, body: r.body,
      metaWamid: wamid, status: r.status as "sent" | "failed",
      contactId: input.contactId ?? null,
      createdAt: new Date(r.created_at).toISOString(),
    };
    if (status === "failed") throw new SaasWhatsAppCloudError("Message send failed (stored as failed)", "SEND_FAILED");
    return msg;
  }

  /**
   * Process an inbound message from the Meta webhook and store in inbox.
   */
  async processInbound(tenantId: string, msg: InboundWaMessage): Promise<void> {
    // Upsert conversation keyed by from-number
    const convRows = await this.db.query<{ id: string }>(
      `SELECT id FROM conversations WHERE tenant_id=$1 AND channel='whatsapp'
       AND metadata->>'wa_to' = $2 LIMIT 1`,
      [tenantId, msg.from],
    ).catch(() => [] as { id: string }[]);

    let conversationId: string;
    if (convRows[0]) {
      conversationId = convRows[0].id;
      await this.db.query(
        `UPDATE conversations SET last_message=$1, last_message_at=NOW(), updated_at=NOW(),
         unread_count = COALESCE(unread_count,0) + 1 WHERE id=$2`,
        [msg.body.slice(0, 120), conversationId],
      ).catch(() => null);
    } else {
      const newConv = await this.db.query<{ id: string }>(
        `INSERT INTO conversations
           (tenant_id, channel, status, last_message, last_message_at, updated_at, metadata)
         VALUES ($1,'whatsapp','open',$2,NOW(),NOW(),$3::jsonb)
         RETURNING id`,
        [tenantId, msg.body.slice(0, 120), JSON.stringify({ wa_to: msg.from, wa_id: msg.waId })],
      );
      conversationId = newConv[0]?.id ?? "";
    }

    if (!conversationId) return;

    // Store inbound message
    await this.db.query(
      `INSERT INTO saas_messages
         (conversation_id, tenant_id, direction, body, status, external_id, created_at)
       VALUES ($1,$2,'inbound',$3,'received',$4,to_timestamp($5))
       ON CONFLICT (external_id) DO NOTHING`,
      [conversationId, tenantId, msg.body, msg.wamid, msg.timestamp],
    ).catch(() => null);
  }

  async listMessages(tenantId: string, opts?: { limit?: number }): Promise<CloudWaMessage[]> {
    const limit = Math.min(opts?.limit ?? 50, 200);
    const rows = await this.db.query<MsgRow>(
      `SELECT id, tenant_id, NULL::uuid AS conversation_id, to_number, body, twilio_sid, status,
              NULL::uuid AS contact_id, created_at
       FROM saas_sms_log WHERE tenant_id=$1
       ORDER BY created_at DESC LIMIT $2`,
      [tenantId, limit],
    );
    return rows.map((r) => ({
      id: r.id, tenantId: r.tenant_id, conversationId: r.conversation_id ?? "",
      to: r.to_number, body: r.body, metaWamid: r.twilio_sid,
      status: r.status as "sent" | "failed", contactId: r.contact_id,
      createdAt: new Date(r.created_at).toISOString(),
    }));
  }
}

let _instance: SaasWhatsAppCloudService | null = null;
export function getSaasWhatsAppCloudService(): SaasWhatsAppCloudService {
  if (!_instance) _instance = new SaasWhatsAppCloudService();
  return _instance;
}
export function resetSaasWhatsAppCloudServiceForTests(): void { _instance = null; }
