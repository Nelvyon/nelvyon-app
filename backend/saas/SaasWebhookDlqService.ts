import type { DbClient } from "../db/DbClient";
import { DbClient as DbClientClass } from "../db/DbClient";

export type WebhookFailure = {
  id: string;
  webhookId: string | null;
  eventType: string | null;
  payload: Record<string, unknown>;
  errorMessage: string | null;
  attempts: number;
  lastAttemptAt: string;
  replayedAt: string | null;
};

export class SaasWebhookDlqService {
  constructor(private readonly deps: { db?: Pick<DbClient, "query"> } = {}) {}
  private get db() { return this.deps.db ?? DbClientClass.getInstance(); }

  async recordFailure(params: {
    tenantId: string;
    webhookId?: string;
    eventType?: string;
    payload: Record<string, unknown>;
    errorMessage: string;
  }): Promise<string> {
    const rows = await this.db.query<{ id: string }>(
      `INSERT INTO saas_webhook_failures (tenant_id, webhook_id, event_type, payload, error_message)
       VALUES ($1,$2,$3,$4,$5) RETURNING id`,
      [params.tenantId, params.webhookId ?? null, params.eventType ?? null, JSON.stringify(params.payload), params.errorMessage],
    );
    return rows[0]!.id;
  }

  async listFailures(tenantId: string, limit = 50): Promise<WebhookFailure[]> {
    const rows = await this.db.query<Record<string, unknown>>(
      `SELECT id, webhook_id, event_type, payload, error_message, attempts, last_attempt_at, replayed_at
       FROM saas_webhook_failures WHERE tenant_id=$1 ORDER BY last_attempt_at DESC LIMIT $2`,
      [tenantId, limit],
    );
    return rows.map(mapRow);
  }

  async markReplayed(id: string, tenantId: string): Promise<void> {
    await this.db.query(
      `UPDATE saas_webhook_failures SET replayed_at=NOW(), attempts=attempts+1
       WHERE id=$1 AND tenant_id=$2`,
      [id, tenantId],
    );
  }
}

function mapRow(r: Record<string, unknown>): WebhookFailure {
  return {
    id: String(r.id),
    webhookId: r.webhook_id != null ? String(r.webhook_id) : null,
    eventType: r.event_type != null ? String(r.event_type) : null,
    payload: typeof r.payload === "object" && r.payload !== null ? (r.payload as Record<string, unknown>) : {},
    errorMessage: r.error_message != null ? String(r.error_message) : null,
    attempts: Number(r.attempts),
    lastAttemptAt: String(r.last_attempt_at),
    replayedAt: r.replayed_at != null ? String(r.replayed_at) : null,
  };
}

let _svc: SaasWebhookDlqService | undefined;
export function getSaasWebhookDlqService(): SaasWebhookDlqService {
  if (!_svc) _svc = new SaasWebhookDlqService();
  return _svc;
}
