import type { DbClient } from "../db/DbClient";
import { DbClient as DbClientClass } from "../db/DbClient";

export type DeliverabilitySnapshot = {
  bounceRate: number;
  complaintRate: number;
  sent30d: number;
  bounced30d: number;
  complaints30d: number;
  dedicatedIp: string | null;
  warmupDay: number;
  healthScore: number;
  capturedAt: string;
};

export type DedicatedIpConfig = {
  dedicatedIp: string | null;
  warmupDay: number;
};

export class SaasDeliverabilityService {
  constructor(private readonly deps: { db?: Pick<DbClient, "query"> } = {}) {}
  private get db() { return this.deps.db ?? DbClientClass.getInstance(); }

  async captureSnapshot(tenantId: string): Promise<DeliverabilitySnapshot> {
    const stats = await this.db.query<{
      sent: string;
      bounced: string;
    }>(
      `SELECT
         COUNT(*) FILTER (WHERE cr.status IN ('sent','opened','clicked')) AS sent,
         COUNT(*) FILTER (WHERE cr.status = 'bounced') AS bounced
       FROM saas_campania_recipients cr
       JOIN saas_campanias c ON c.id = cr.campania_id
       WHERE c.tenant_id = $1`,
      [tenantId],
    );
    const sent = Number(stats[0]?.sent ?? 0);
    const bounced = Number(stats[0]?.bounced ?? 0);
    const complaints = 0;
    const bounceRate = sent > 0 ? (bounced / sent) * 100 : 0;
    const complaintRate = sent > 0 ? (complaints / sent) * 100 : 0;
    let healthScore = 100;
    if (bounceRate > 2) healthScore -= 20;
    if (bounceRate > 5) healthScore -= 30;
    if (complaintRate > 0.1) healthScore -= 25;
    healthScore = Math.max(0, Math.min(100, healthScore));

    const prev = await this.getLatest(tenantId);
    const warmupDay = prev?.warmupDay ?? 0;
    const dedicatedIp = prev?.dedicatedIp ?? null;

    const rows = await this.db.query<{ captured_at: string }>(
      `INSERT INTO saas_deliverability_snapshots
         (tenant_id, bounce_rate, complaint_rate, sent_30d, bounced_30d, complaints_30d, dedicated_ip, warmup_day, health_score)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING captured_at`,
      [tenantId, bounceRate, complaintRate, sent, bounced, complaints, dedicatedIp, warmupDay, healthScore],
    );

    return {
      bounceRate,
      complaintRate,
      sent30d: sent,
      bounced30d: bounced,
      complaints30d: complaints,
      dedicatedIp,
      warmupDay,
      healthScore,
      capturedAt: String(rows[0]?.captured_at ?? new Date().toISOString()),
    };
  }

  async getLatest(tenantId: string): Promise<DeliverabilitySnapshot | null> {
    const rows = await this.db.query<Record<string, unknown>>(
      `SELECT bounce_rate, complaint_rate, sent_30d, bounced_30d, complaints_30d,
              dedicated_ip, warmup_day, health_score, captured_at
       FROM saas_deliverability_snapshots
       WHERE tenant_id=$1 ORDER BY captured_at DESC LIMIT 1`,
      [tenantId],
    );
    const r = rows[0];
    if (!r) return null;
    return {
      bounceRate: Number(r.bounce_rate),
      complaintRate: Number(r.complaint_rate),
      sent30d: Number(r.sent_30d),
      bounced30d: Number(r.bounced_30d),
      complaints30d: Number(r.complaints_30d),
      dedicatedIp: r.dedicated_ip != null ? String(r.dedicated_ip) : null,
      warmupDay: Number(r.warmup_day),
      healthScore: Number(r.health_score),
      capturedAt: String(r.captured_at),
    };
  }

  async setDedicatedIp(tenantId: string, cfg: DedicatedIpConfig): Promise<DedicatedIpConfig> {
    await this.db.query(
      `INSERT INTO saas_deliverability_snapshots
         (tenant_id, dedicated_ip, warmup_day, bounce_rate, complaint_rate, sent_30d, bounced_30d, complaints_30d, health_score)
       VALUES ($1,$2,$3,0,0,0,0,0,100)`,
      [tenantId, cfg.dedicatedIp, cfg.warmupDay],
    );
    return cfg;
  }

  async advanceWarmup(tenantId: string): Promise<number> {
    const latest = await this.getLatest(tenantId);
    const next = Math.min(42, (latest?.warmupDay ?? 0) + 1);
    await this.setDedicatedIp(tenantId, { dedicatedIp: latest?.dedicatedIp ?? null, warmupDay: next });
    return next;
  }

  async listSuppressions(tenantId: string): Promise<Array<{ email: string; reason: string; createdAt: string }>> {
    const rows = await this.db.query<{ email: string; reason: string; created_at: string }>(
      `SELECT c.email,
         cr.status AS reason,
         COALESCE(cr.sent_at, NOW()) AS created_at
       FROM saas_campania_recipients cr
       JOIN saas_campanias camp ON camp.id = cr.campania_id
       JOIN saas_contacts c ON c.id = cr.contact_id
       WHERE camp.tenant_id = $1 AND cr.status IN ('bounced','unsubscribed')
       ORDER BY cr.sent_at DESC NULLS LAST LIMIT 200`,
      [tenantId],
    );
    return rows.map((r) => ({ email: r.email, reason: r.reason, createdAt: String(r.created_at) }));
  }
}

let _svc: SaasDeliverabilityService | undefined;
export function getSaasDeliverabilityService(): SaasDeliverabilityService {
  if (!_svc) _svc = new SaasDeliverabilityService();
  return _svc;
}
export function resetSaasDeliverabilityServiceForTests(): void { _svc = undefined; }
