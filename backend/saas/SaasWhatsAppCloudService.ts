/**
 * SaasWhatsAppCloudService — WhatsApp Business Cloud API (Meta Graph API).
 *
 * Requires env vars:
 *   META_WA_PHONE_NUMBER_ID            — phone number ID from Meta developer portal
 *   META_WA_ACCESS_TOKEN               — permanent system user access token
 *   META_WA_VERIFY_TOKEN               — arbitrary secret for webhook challenge verification
 *   META_WA_APP_SECRET                 — app secret for signature verification (optional)
 *   META_WA_BUSINESS_ACCOUNT_ID        — WABA ID (optional, resolved via graph API if absent)
 *   META_WA_CATALOG_ID                 — product catalog ID for WA Commerce (optional)
 *
 * Twilio remains as fallback when Meta env vars are absent.
 * Priority: Cloud API first → Twilio fallback → NOT_CONFIGURED error.
 */
import { DbClient } from "../db/DbClient";
import type { SaasPostgresPort } from "./SaasOnboardingService";

const GRAPH_VERSION = "v19.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

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
  body?: string;
  templateName?: string;
  templateLanguage?: string;
  templateComponents?: WaTemplateComponent[];
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

export type WaTemplateStatus = "APPROVED" | "PENDING" | "REJECTED" | "PAUSED";
export type WaTemplateCategory = "MARKETING" | "UTILITY" | "AUTHENTICATION";

export type WaTemplateComponent = {
  type: "HEADER" | "BODY" | "FOOTER" | "BUTTONS";
  format?: "TEXT" | "IMAGE" | "VIDEO" | "DOCUMENT";
  text?: string;
  buttons?: Array<{ type: string; text: string; url?: string; phone_number?: string }>;
  parameters?: Array<{ type: "text" | "image" | "document"; text?: string; image?: { link: string }; document?: { link: string } }>;
};

export type WaTemplate = {
  id: string;
  tenantId: string;
  metaTemplateId: string;
  name: string;
  language: string;
  status: WaTemplateStatus;
  category: WaTemplateCategory | null;
  components: WaTemplateComponent[];
  qualityScore: string | null;
  syncedAt: string;
};

export type WaCatalogProduct = {
  id: string;
  tenantId: string;
  metaProductId: string;
  catalogId: string;
  name: string;
  description: string | null;
  priceAmount: number | null;
  priceCurrency: string;
  imageUrl: string | null;
  availability: string;
  retailerId: string | null;
  syncedAt: string;
};

type MsgRow = {
  id: string; tenant_id: string; conversation_id: string | null;
  to_number: string; body: string; twilio_sid: string | null;
  status: string; contact_id: string | null; created_at: Date;
};

type TemplateRow = {
  id: string; tenant_id: string; meta_template_id: string;
  name: string; language: string; status: string; category: string | null;
  components: WaTemplateComponent[]; quality_score: string | null; synced_at: Date;
};

type CatalogProductRow = {
  id: string; tenant_id: string; meta_product_id: string; catalog_id: string;
  name: string; description: string | null; price_amount: string | null;
  price_currency: string; image_url: string | null; availability: string;
  retailer_id: string | null; synced_at: Date;
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

function mapTemplateRow(r: TemplateRow): WaTemplate {
  return {
    id: r.id, tenantId: r.tenant_id, metaTemplateId: r.meta_template_id,
    name: r.name, language: r.language,
    status: r.status as WaTemplateStatus,
    category: r.category as WaTemplateCategory | null,
    components: Array.isArray(r.components) ? r.components : [],
    qualityScore: r.quality_score,
    syncedAt: new Date(r.synced_at).toISOString(),
  };
}

function mapCatalogRow(r: CatalogProductRow): WaCatalogProduct {
  return {
    id: r.id, tenantId: r.tenant_id, metaProductId: r.meta_product_id,
    catalogId: r.catalog_id, name: r.name, description: r.description,
    priceAmount: r.price_amount ? parseFloat(r.price_amount) : null,
    priceCurrency: r.price_currency, imageUrl: r.image_url,
    availability: r.availability, retailerId: r.retailer_id,
    syncedAt: new Date(r.synced_at).toISOString(),
  };
}

async function metaSend(
  phoneNumberId: string,
  accessToken: string,
  to: string,
  body: string,
  fetchFn: typeof fetch = fetch,
): Promise<string> {
  const url = `${GRAPH_BASE}/${encodeURIComponent(phoneNumberId)}/messages`;
  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: to.replace(/^\+/, ""),
    type: "text",
    text: { preview_url: false, body },
  };
  const res = await fetchFn(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload),
  });
  const data = await res.json() as { messages?: Array<{ id: string }>; error?: { message: string } };
  if (!res.ok || data.error) {
    throw new SaasWhatsAppCloudError(`Meta Cloud API error: ${data.error?.message ?? "unknown"}`, "API_ERROR");
  }
  return data.messages?.[0]?.id ?? "";
}

async function metaSendTemplateMsg(
  phoneNumberId: string,
  accessToken: string,
  to: string,
  templateName: string,
  language: string,
  components: WaTemplateComponent[] | undefined,
  fetchFn: typeof fetch = fetch,
): Promise<string> {
  const url = `${GRAPH_BASE}/${encodeURIComponent(phoneNumberId)}/messages`;
  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: to.replace(/^\+/, ""),
    type: "template",
    template: {
      name: templateName,
      language: { code: language },
      ...(components?.length ? { components } : {}),
    },
  };
  const res = await fetchFn(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload),
  });
  const data = await res.json() as { messages?: Array<{ id: string }>; error?: { message: string } };
  if (!res.ok || data.error) {
    throw new SaasWhatsAppCloudError(`Meta Cloud API template error: ${data.error?.message ?? "unknown"}`, "API_ERROR");
  }
  return data.messages?.[0]?.id ?? "";
}

export class SaasWhatsAppCloudService {
  private wabaIdCache: string | null = null;

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

  // ── WABA ID resolution ─────────────────────────────────────────────────────

  async resolveWabaId(): Promise<string> {
    if (this.wabaIdCache) return this.wabaIdCache;
    const envId = process.env.META_WA_BUSINESS_ACCOUNT_ID?.trim();
    if (envId) { this.wabaIdCache = envId; return envId; }

    const creds = getMetaCreds();
    if (!creds) throw new SaasWhatsAppCloudError("WhatsApp Cloud API not configured", "NOT_CONFIGURED");

    const url = `${GRAPH_BASE}/${encodeURIComponent(creds.phoneNumberId)}?fields=whatsapp_business_account`;
    const res = await this.fetchFn(url, { headers: { Authorization: `Bearer ${creds.accessToken}` } });
    const data = await res.json() as {
      whatsapp_business_account?: { id: string };
      error?: { message: string };
    };
    if (!res.ok || data.error) {
      throw new SaasWhatsAppCloudError(`Failed to resolve WABA ID: ${data.error?.message ?? "unknown"}`, "API_ERROR");
    }
    const wabaId = data.whatsapp_business_account?.id;
    if (!wabaId) throw new SaasWhatsAppCloudError("WABA ID not found in phone number response", "NOT_FOUND");
    this.wabaIdCache = wabaId;
    return wabaId;
  }

  // ── Templates ──────────────────────────────────────────────────────────────

  async fetchMessageTemplates(wabaId: string): Promise<Array<{
    id: string; name: string; language: string; status: string;
    category: string; components: WaTemplateComponent[]; quality_score?: { score: string };
  }>> {
    const creds = getMetaCreds();
    if (!creds) throw new SaasWhatsAppCloudError("WhatsApp Cloud API not configured", "NOT_CONFIGURED");

    let all: Array<{ id: string; name: string; language: string; status: string; category: string; components: WaTemplateComponent[]; quality_score?: { score: string } }> = [];
    let url: string | null = `${GRAPH_BASE}/${encodeURIComponent(wabaId)}/message_templates?limit=100`;

    while (url) {
      const res = await this.fetchFn(url, { headers: { Authorization: `Bearer ${creds.accessToken}` } });
      const data = await res.json() as {
        data?: typeof all;
        paging?: { next?: string };
        error?: { message: string };
      };
      if (!res.ok || data.error) {
        throw new SaasWhatsAppCloudError(`Failed to fetch templates: ${data.error?.message ?? "unknown"}`, "API_ERROR");
      }
      all = all.concat(data.data ?? []);
      url = data.paging?.next ?? null;
    }
    return all;
  }

  async syncTemplates(tenantId: string): Promise<number> {
    const wabaId = await this.resolveWabaId();
    const templates = await this.fetchMessageTemplates(wabaId);

    for (const t of templates) {
      await this.db.query(
        `INSERT INTO saas_wa_templates
           (tenant_id, meta_template_id, name, language, status, category, components, quality_score, synced_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,NOW())
         ON CONFLICT (tenant_id, name, language)
         DO UPDATE SET meta_template_id=$2, status=$5, category=$6,
                       components=$7::jsonb, quality_score=$8, synced_at=NOW()`,
        [
          tenantId, t.id, t.name, t.language, t.status, t.category ?? null,
          JSON.stringify(t.components ?? []),
          t.quality_score?.score ?? null,
        ],
      );
    }
    return templates.length;
  }

  async listTemplates(tenantId: string, opts?: { status?: string; language?: string }): Promise<WaTemplate[]> {
    const conditions: string[] = ["tenant_id=$1"];
    const params: unknown[] = [tenantId];
    if (opts?.status) { params.push(opts.status); conditions.push(`status=$${params.length}`); }
    if (opts?.language) { params.push(opts.language); conditions.push(`language=$${params.length}`); }

    const rows = await this.db.query<TemplateRow>(
      `SELECT * FROM saas_wa_templates WHERE ${conditions.join(" AND ")} ORDER BY name ASC`,
      params,
    );
    return rows.map(mapTemplateRow);
  }

  async sendTemplate(tenantId: string, input: {
    to: string;
    templateName: string;
    templateLanguage?: string;
    templateComponents?: WaTemplateComponent[];
    contactId?: string | null;
  }): Promise<CloudWaMessage> {
    if (!input.to.trim()) throw new SaasWhatsAppCloudError("to is required", "VALIDATION");
    if (!input.templateName.trim()) throw new SaasWhatsAppCloudError("templateName is required", "VALIDATION");

    const creds = getMetaCreds();
    if (!creds) throw new SaasWhatsAppCloudError("WhatsApp Cloud API not configured", "NOT_CONFIGURED");

    const lang = input.templateLanguage ?? "es";

    return this.send(tenantId, {
      to: input.to,
      templateName: input.templateName,
      templateLanguage: lang,
      templateComponents: input.templateComponents,
      contactId: input.contactId,
    });
  }

  // ── Catalog ────────────────────────────────────────────────────────────────

  async fetchCatalogProducts(catalogId: string): Promise<Array<{
    id: string; name: string; description?: string;
    price?: string; currency?: string; image_url?: string;
    availability?: string; retailer_id?: string;
  }>> {
    const creds = getMetaCreds();
    if (!creds) throw new SaasWhatsAppCloudError("WhatsApp Cloud API not configured", "NOT_CONFIGURED");

    let all: Array<{ id: string; name: string; description?: string; price?: string; currency?: string; image_url?: string; availability?: string; retailer_id?: string }> = [];
    let url: string | null = `${GRAPH_BASE}/${encodeURIComponent(catalogId)}/products?fields=id,name,description,price,currency,image_url,availability,retailer_id&limit=100`;

    while (url) {
      const res = await this.fetchFn(url, { headers: { Authorization: `Bearer ${creds.accessToken}` } });
      const data = await res.json() as {
        data?: typeof all;
        paging?: { next?: string };
        error?: { message: string };
      };
      if (!res.ok || data.error) {
        throw new SaasWhatsAppCloudError(`Failed to fetch catalog: ${data.error?.message ?? "unknown"}`, "API_ERROR");
      }
      all = all.concat(data.data ?? []);
      url = data.paging?.next ?? null;
    }
    return all;
  }

  async syncCatalog(tenantId: string): Promise<number> {
    const catalogId = process.env.META_WA_CATALOG_ID?.trim();
    if (!catalogId) {
      // Try to get from saas_wa_settings
      const rows = await this.db.query<{ catalog_id: string | null }>(
        `SELECT catalog_id FROM saas_wa_settings WHERE tenant_id=$1`,
        [tenantId],
      );
      if (!rows[0]?.catalog_id) {
        throw new SaasWhatsAppCloudError(
          "Catalog ID not configured. Set META_WA_CATALOG_ID or configure via saas_wa_settings.",
          "NOT_CONFIGURED",
        );
      }
      return this._syncCatalogId(tenantId, rows[0].catalog_id);
    }
    return this._syncCatalogId(tenantId, catalogId);
  }

  private async _syncCatalogId(tenantId: string, catalogId: string): Promise<number> {
    const products = await this.fetchCatalogProducts(catalogId);
    for (const p of products) {
      const price = p.price ? parseFloat(p.price.replace(/[^0-9.]/g, "")) : null;
      const currency = p.currency ?? "EUR";
      await this.db.query(
        `INSERT INTO saas_wa_catalog_products
           (tenant_id, meta_product_id, catalog_id, name, description, price_amount,
            price_currency, image_url, availability, retailer_id, synced_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW())
         ON CONFLICT (tenant_id, meta_product_id)
         DO UPDATE SET name=$4, description=$5, price_amount=$6, price_currency=$7,
                       image_url=$8, availability=$9, retailer_id=$10, synced_at=NOW()`,
        [tenantId, p.id, catalogId, p.name, p.description ?? null, price, currency,
         p.image_url ?? null, p.availability ?? "in stock", p.retailer_id ?? null],
      );
    }
    return products.length;
  }

  async listCatalogProducts(tenantId: string): Promise<WaCatalogProduct[]> {
    const rows = await this.db.query<CatalogProductRow>(
      `SELECT * FROM saas_wa_catalog_products WHERE tenant_id=$1 ORDER BY name ASC`,
      [tenantId],
    );
    return rows.map(mapCatalogRow);
  }

  // ── Send (text + template) ─────────────────────────────────────────────────

  async send(tenantId: string, input: CloudWaSendInput): Promise<CloudWaMessage> {
    if (!input.to.trim()) throw new SaasWhatsAppCloudError("to is required", "VALIDATION");
    if (!input.body?.trim() && !input.templateName) {
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
        wamid = await metaSendTemplateMsg(
          creds.phoneNumberId, creds.accessToken,
          input.to, input.templateName, input.templateLanguage ?? "es",
          input.templateComponents,
          this.fetchFn,
        );
      } else {
        wamid = await metaSend(creds.phoneNumberId, creds.accessToken, input.to, input.body!, this.fetchFn);
      }
    } catch {
      status = "failed";
    }

    const bodyForLog = input.body || `[template:${input.templateName ?? ""}]`;
    const rows = await this.db.query<MsgRow>(
      `INSERT INTO saas_sms_log (tenant_id, to_number, body, twilio_sid, status, created_at)
       VALUES ($1,$2,$3,$4,$5,NOW())
       RETURNING id, tenant_id, NULL::uuid AS conversation_id, to_number, body,
                 twilio_sid, status, NULL::uuid AS contact_id, created_at`,
      [tenantId, input.to, bodyForLog, wamid, status],
    );

    if (conversationId) {
      const snippet = bodyForLog.slice(0, 120);
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

  // ── Inbound webhook ────────────────────────────────────────────────────────

  async processInbound(tenantId: string, msg: InboundWaMessage): Promise<void> {
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
