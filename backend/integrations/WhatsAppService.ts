import type { DbClient } from "../db/DbClient";
import { DbClient as DbClientClass } from "../db/DbClient";
import { OsAgentError } from "../os-agents/OsAgentError";

const WA_API_VERSION = "v19.0";
const GRAPH_BASE = `https://graph.facebook.com/${WA_API_VERSION}`;

export interface WhatsAppCredentials {
  userId: string;
  phoneNumberId: string;
  wabaId: string;
  accessToken: string;
  isActive: boolean;
}

export interface WhatsAppMessage {
  id: string;
  userId: string;
  recipient: string;
  messageType: string | null;
  content: string | null;
  status: string;
  sentAt: string;
}

export interface BulkSendResult {
  sent: number;
  failed: number;
  results: ReadonlyArray<{
    recipient: string;
    ok: boolean;
    messageId?: string;
    error?: string;
  }>;
}

export type WhatsAppServiceDeps = {
  db?: Pick<DbClient, "query">;
  fetchFn?: typeof fetch;
};

type GraphMessagesResponse = {
  messages?: ReadonlyArray<{ id?: string }>;
  error?: { message?: string };
};

export class WhatsAppService {
  constructor(private readonly deps: WhatsAppServiceDeps = {}) {}

  private get db(): Pick<DbClient, "query"> {
    return this.deps.db ?? DbClientClass.getInstance();
  }

  private get fetchImpl(): typeof fetch {
    return this.deps.fetchFn ?? globalThis.fetch.bind(globalThis);
  }

  private accessQuery(accessToken: string): string {
    return `access_token=${encodeURIComponent(accessToken)}`;
  }

  async saveCredentials(userId: string, phoneNumberId: string, wabaId: string, accessToken: string): Promise<void> {
    const pid = phoneNumberId.trim();
    const token = accessToken.trim();
    if (!pid || !token) {
      throw new OsAgentError("phoneNumberId and accessToken are required.", "whatsapp_validation");
    }
    const waba = wabaId.trim() || null;
    await this.db.query(
      `INSERT INTO integration_whatsapp
         (user_id, phone_number_id, waba_id, access_token, is_active, updated_at)
       VALUES ($1::uuid, $2, $3, $4, true, NOW())
       ON CONFLICT (user_id)
       DO UPDATE SET
         phone_number_id = EXCLUDED.phone_number_id,
         waba_id = EXCLUDED.waba_id,
         access_token = EXCLUDED.access_token,
         is_active = true,
         updated_at = NOW()`,
      [userId, pid, waba, token],
    );
  }

  async getCredentials(userId: string): Promise<WhatsAppCredentials | null> {
    const rows = await this.db.query<{
      user_id: string;
      phone_number_id: string | null;
      waba_id: string | null;
      access_token: string | null;
      is_active: boolean;
    }>(
      `SELECT user_id::text, phone_number_id, waba_id, access_token, is_active
       FROM integration_whatsapp
       WHERE user_id = $1::uuid AND is_active = true
       LIMIT 1`,
      [userId],
    );
    const r = rows[0];
    if (!r || !r.access_token || !r.phone_number_id) return null;
    return {
      userId: r.user_id,
      phoneNumberId: r.phone_number_id,
      wabaId: r.waba_id ?? "",
      accessToken: r.access_token,
      isActive: r.is_active,
    };
  }

  private async requireCredentials(userId: string): Promise<WhatsAppCredentials> {
    const c = await this.getCredentials(userId);
    if (!c) {
      throw new OsAgentError("WhatsApp is not connected for this user.", "whatsapp_auth");
    }
    return c;
  }

  private async graphSendMessages(
    phoneNumberId: string,
    accessToken: string,
    jsonBody: Record<string, unknown>,
  ): Promise<GraphMessagesResponse> {
    const path = `/${encodeURIComponent(phoneNumberId)}/messages`;
    const url = `${GRAPH_BASE}${path}?${this.accessQuery(accessToken)}`;
    const res = await this.fetchImpl(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(jsonBody),
    });
    const text = await res.text();
    let body: GraphMessagesResponse;
    try {
      body = JSON.parse(text) as GraphMessagesResponse;
    } catch {
      throw new OsAgentError(`WhatsApp Graph returned non-JSON (HTTP ${res.status})`, "whatsapp_http");
    }
    if (!res.ok || body.error != null) {
      const msg =
        body.error?.message ?? (typeof body === "object" ? JSON.stringify(body).slice(0, 400) : text.slice(0, 400));
      throw new OsAgentError(`WhatsApp API error (HTTP ${res.status}): ${msg}`, "whatsapp_api");
    }
    return body;
  }

  private extractMessageId(res: GraphMessagesResponse): string {
    const id = res.messages?.[0]?.id;
    return typeof id === "string" && id ? id : "";
  }

  private async recordMessage(
    userId: string,
    recipient: string,
    messageType: string,
    content: string,
    status: string,
  ): Promise<void> {
    await this.db.query(
      `INSERT INTO whatsapp_messages (user_id, recipient, message_type, content, status)
       VALUES ($1::uuid, $2, $3, $4, $5)`,
      [userId, recipient.trim(), messageType, content, status],
    );
  }

  async sendTextMessage(userId: string, recipient: string, message: string): Promise<{ messageId: string }> {
    const bodyText = message.trim();
    const to = recipient.trim();
    if (!bodyText || !to) {
      throw new OsAgentError("recipient and message are required.", "whatsapp_validation");
    }
    const c = await this.requireCredentials(userId);
    const payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "text",
      text: {
        preview_url: false,
        body: bodyText,
      },
    };
    const out = await this.graphSendMessages(c.phoneNumberId, c.accessToken, payload);
    const messageId = this.extractMessageId(out);
    if (!messageId) {
      throw new OsAgentError("WhatsApp API did not return a message id.", "whatsapp_api");
    }
    await this.recordMessage(userId, to, "text", bodyText, "sent");
    return { messageId };
  }

  async sendTemplateMessage(
    userId: string,
    recipient: string,
    templateName: string,
    languageCode: string,
    components: ReadonlyArray<Record<string, unknown>>,
  ): Promise<{ messageId: string }> {
    const to = recipient.trim();
    const name = templateName.trim();
    const lang = languageCode.trim();
    if (!to || !name || !lang) {
      throw new OsAgentError("recipient, templateName y languageCode son requeridos.", "whatsapp_validation");
    }
    const c = await this.requireCredentials(userId);
    const payload = {
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: {
        name,
        language: { code: lang },
        components: [...components],
      },
    };
    const out = await this.graphSendMessages(c.phoneNumberId, c.accessToken, payload);
    const messageId = this.extractMessageId(out);
    if (!messageId) {
      throw new OsAgentError("WhatsApp API did not return a message id.", "whatsapp_api");
    }
    const content = JSON.stringify({ templateName: name, languageCode: lang, components: [...components] });
    await this.recordMessage(userId, to, "template", content, "sent");
    return { messageId };
  }

  async sendBulkMessages(userId: string, recipients: string[], message: string): Promise<BulkSendResult> {
    const results: Array<{ recipient: string; ok: boolean; messageId?: string; error?: string }> = [];
    let sent = 0;
    let failed = 0;
    for (const raw of recipients) {
      const recipient = String(raw ?? "").trim();
      if (!recipient) continue;
      try {
        const { messageId } = await this.sendTextMessage(userId, recipient, message);
        sent += 1;
        results.push({ recipient, ok: true, messageId });
      } catch (e: unknown) {
        failed += 1;
        const errMsg = e instanceof OsAgentError ? e.message : e instanceof Error ? e.message : String(e);
        results.push({ recipient, ok: false, error: errMsg });
      }
    }
    return { sent, failed, results };
  }

  async getMessageHistory(userId: string, limit = 50): Promise<WhatsAppMessage[]> {
    const capped = Math.max(1, Math.min(limit, 500));
    const rows = await this.db.query<{
      id: string;
      user_id: string;
      recipient: string;
      message_type: string | null;
      content: string | null;
      status: string;
      sent_at: Date | string;
    }>(
      `SELECT id::text, user_id::text, recipient, message_type, content, status, sent_at
       FROM whatsapp_messages
       WHERE user_id = $1::uuid
       ORDER BY sent_at DESC
       LIMIT $2::int`,
      [userId, capped],
    );
    return rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      recipient: r.recipient,
      messageType: r.message_type,
      content: r.content,
      status: r.status,
      sentAt: typeof r.sent_at === "string" ? r.sent_at : r.sent_at.toISOString(),
    }));
  }

  async revokeAccess(userId: string): Promise<void> {
    await this.db.query(
      `UPDATE integration_whatsapp SET is_active = false, updated_at = NOW() WHERE user_id = $1::uuid`,
      [userId],
    );
  }
}

let cachedWhatsApp: WhatsAppService | undefined;

export function getWhatsAppService(): WhatsAppService {
  if (!cachedWhatsApp) cachedWhatsApp = new WhatsAppService();
  return cachedWhatsApp;
}

export function resetWhatsAppServiceForTests(): void {
  cachedWhatsApp = undefined;
}
