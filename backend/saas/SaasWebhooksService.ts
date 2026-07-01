import crypto from "crypto";
import { DbClient } from "../db/DbClient";
import type { SaasPostgresPort } from "./SaasOnboardingService";
import { getSaasWebhookDlqService } from "./SaasWebhookDlqService";

export interface SaasWebhook {
  id: string;
  tenantId: string;
  name: string;
  url: string;
  events: string[];
  active: boolean;
  secret: string;
  deliveries: number;
  failures: number;
  lastDeliveredAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SaasWebhookDelivery {
  id: string;
  webhookId: string;
  event: string;
  payload: Record<string, unknown>;
  statusCode: number | null;
  responseBody: string | null;
  durationMs: number | null;
  success: boolean | null;
  attempt: number;
  createdAt: string;
}

export interface CreateWebhookInput {
  name: string;
  url: string;
  events: string[];
}

export class SaasWebhooksError extends Error {
  constructor(
    message: string,
    public readonly code: "NOT_FOUND" | "VALIDATION" | "FORBIDDEN",
  ) {
    super(message);
    this.name = "SaasWebhooksError";
  }
}

type WebhookRow = {
  id: string;
  tenant_id: string;
  name: string;
  url: string;
  events: string[];
  active: boolean;
  secret: string;
  deliveries: number | string;
  failures: number | string;
  last_delivered_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
};

function rowToWebhook(r: WebhookRow): SaasWebhook {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    name: r.name,
    url: r.url,
    events: r.events ?? [],
    active: Boolean(r.active),
    secret: r.secret,
    deliveries: Number(r.deliveries),
    failures: Number(r.failures),
    lastDeliveredAt: r.last_delivered_at ? new Date(r.last_delivered_at).toISOString() : null,
    createdAt: new Date(r.created_at).toISOString(),
    updatedAt: new Date(r.updated_at).toISOString(),
  };
}

const VALID_EVENTS = [
  "contact.created", "contact.updated", "deal.created", "deal.stage_changed",
  "campania.sent", "workflow.triggered", "form.submitted", "invoice.paid",
];

export class SaasWebhooksService {
  constructor(private readonly db: SaasPostgresPort = DbClient.getInstance()) {}

  async list(tenantId: string): Promise<SaasWebhook[]> {
    const rows = await this.db.query<WebhookRow>(
      `SELECT id, tenant_id, name, url, events, active, secret, deliveries, failures,
              last_delivered_at, created_at, updated_at
       FROM webhooks WHERE tenant_id = $1 ORDER BY created_at DESC`,
      [tenantId],
    );
    return rows.map(rowToWebhook);
  }

  async get(tenantId: string, id: string): Promise<SaasWebhook | null> {
    const rows = await this.db.query<WebhookRow>(
      `SELECT id, tenant_id, name, url, events, active, secret, deliveries, failures,
              last_delivered_at, created_at, updated_at
       FROM webhooks WHERE tenant_id = $1 AND id = $2 LIMIT 1`,
      [tenantId, id],
    );
    return rows[0] ? rowToWebhook(rows[0]) : null;
  }

  async create(tenantId: string, input: CreateWebhookInput): Promise<SaasWebhook> {
    if (!input.name.trim()) throw new SaasWebhooksError("name is required", "VALIDATION");
    if (!input.url.startsWith("https://")) throw new SaasWebhooksError("url must be HTTPS", "VALIDATION");
    const invalid = input.events.filter((e) => !VALID_EVENTS.includes(e));
    if (invalid.length > 0) throw new SaasWebhooksError(`Invalid events: ${invalid.join(", ")}`, "VALIDATION");
    const secret = crypto.randomBytes(32).toString("hex");
    const rows = await this.db.query<WebhookRow>(
      `INSERT INTO webhooks (tenant_id, name, url, events, active, secret, updated_at)
       VALUES ($1,$2,$3,$4::text[],$5,$6,NOW())
       RETURNING id, tenant_id, name, url, events, active, secret, deliveries, failures,
                 last_delivered_at, created_at, updated_at`,
      [tenantId, input.name.trim(), input.url, input.events, true, secret],
    );
    if (!rows[0]) throw new SaasWebhooksError("Failed to create webhook", "VALIDATION");
    return rowToWebhook(rows[0]);
  }

  async update(tenantId: string, id: string, input: Partial<CreateWebhookInput & { active: boolean }>): Promise<SaasWebhook> {
    const existing = await this.get(tenantId, id);
    if (!existing) throw new SaasWebhooksError("Webhook not found", "NOT_FOUND");
    const sets: string[] = ["updated_at = NOW()"];
    const params: unknown[] = [tenantId, id];
    let idx = 3;
    if (input.name !== undefined) { sets.push(`name = $${idx++}`); params.push(input.name.trim()); }
    if (input.url !== undefined) {
      if (!input.url.startsWith("https://")) throw new SaasWebhooksError("url must be HTTPS", "VALIDATION");
      sets.push(`url = $${idx++}`); params.push(input.url);
    }
    if (input.events !== undefined) { sets.push(`events = $${idx++}::text[]`); params.push(input.events); }
    if (input.active !== undefined) { sets.push(`active = $${idx++}`); params.push(input.active); }
    const rows = await this.db.query<WebhookRow>(
      `UPDATE webhooks SET ${sets.join(",")} WHERE tenant_id=$1 AND id=$2
       RETURNING id, tenant_id, name, url, events, active, secret, deliveries, failures,
                 last_delivered_at, created_at, updated_at`,
      params,
    );
    if (!rows[0]) throw new SaasWebhooksError("Webhook not found", "NOT_FOUND");
    return rowToWebhook(rows[0]);
  }

  async delete(tenantId: string, id: string): Promise<void> {
    const rows = await this.db.query<{ id: string }>(
      `DELETE FROM webhooks WHERE tenant_id=$1 AND id=$2 RETURNING id`,
      [tenantId, id],
    );
    if (!rows[0]) throw new SaasWebhooksError("Webhook not found", "NOT_FOUND");
  }

  /** Dispatch event to all active webhooks for tenant. Fire-and-forget. */
  async dispatch(tenantId: string, event: string, payload: Record<string, unknown>): Promise<void> {
    const webhooks = await this.db.query<{ id: string; url: string; secret: string }>(
      `SELECT id, url, secret FROM webhooks WHERE tenant_id=$1 AND active=TRUE AND $2=ANY(events)`,
      [tenantId, event],
    );
    for (const wh of webhooks) {
      void this.deliver(tenantId, wh.id, wh.url, wh.secret, event, payload);
    }
  }

  private async deliver(
    tenantId: string,
    webhookId: string,
    url: string,
    secret: string,
    event: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const body = JSON.stringify({ event, data: payload, timestamp: Date.now() });
    const sig = crypto.createHmac("sha256", secret).update(body).digest("hex");
    const start = Date.now();
    let statusCode: number | null = null;
    let responseBody: string | null = null;
    let success = false;
    let errorMessage: string | null = null;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Nelvyon-Signature": `sha256=${sig}`, "X-Nelvyon-Event": event },
        body,
        signal: AbortSignal.timeout(10_000),
      });
      statusCode = res.status;
      responseBody = await res.text().catch(() => null);
      success = res.ok;
      if (!success) errorMessage = `HTTP ${statusCode}`;
    } catch (err) {
      success = false;
      errorMessage = err instanceof Error ? err.message : "Delivery failed";
    }
    if (!success) {
      await getSaasWebhookDlqService().recordFailure({
        tenantId,
        webhookId,
        eventType: event,
        payload,
        errorMessage: errorMessage ?? "Delivery failed",
      }).catch(() => null);
    }
    const durationMs = Date.now() - start;
    await this.db.query(
      `INSERT INTO webhook_deliveries (webhook_id, event, payload, status_code, response_body, duration_ms, success)
       VALUES ($1,$2,$3::jsonb,$4,$5,$6,$7)`,
      [webhookId, event, JSON.stringify({ event, data: payload }), statusCode, responseBody, durationMs, success],
    ).catch(() => null);
    await this.db.query(
      `UPDATE webhooks SET deliveries = deliveries + 1,
        failures = failures + CASE WHEN $2 THEN 0 ELSE 1 END,
        last_delivered_at = CASE WHEN $2 THEN NOW() ELSE last_delivered_at END,
        updated_at = NOW()
       WHERE id = $1`,
      [webhookId, success],
    ).catch(() => null);
  }

  async listDeliveries(tenantId: string, webhookId: string): Promise<SaasWebhookDelivery[]> {
    const wh = await this.get(tenantId, webhookId);
    if (!wh) throw new SaasWebhooksError("Webhook not found", "NOT_FOUND");
    const rows = await this.db.query<{
      id: string; webhook_id: string; event: string; payload: Record<string, unknown>;
      status_code: number | null; response_body: string | null; duration_ms: number | null;
      success: boolean | null; attempt: number; created_at: Date | string;
    }>(
      `SELECT id, webhook_id, event, payload, status_code, response_body, duration_ms, success, attempt, created_at
       FROM webhook_deliveries WHERE webhook_id=$1 ORDER BY created_at DESC LIMIT 100`,
      [webhookId],
    );
    return rows.map((r) => ({
      id: r.id,
      webhookId: r.webhook_id,
      event: r.event,
      payload: r.payload as Record<string, unknown>,
      statusCode: r.status_code,
      responseBody: r.response_body,
      durationMs: r.duration_ms,
      success: r.success,
      attempt: r.attempt,
      createdAt: new Date(r.created_at).toISOString(),
    }));
  }
}

let _instance: SaasWebhooksService | null = null;
export function getSaasWebhooksService(): SaasWebhooksService {
  if (!_instance) _instance = new SaasWebhooksService();
  return _instance;
}
export function resetSaasWebhooksServiceForTests(): void { _instance = null; }
