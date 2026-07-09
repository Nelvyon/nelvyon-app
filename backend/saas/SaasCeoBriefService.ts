/**
 * S58 — CEO morning brief: aggregates KPIs for daily digest (email + voice).
 */
import { DbClient } from "../db/DbClient";
import type { SaasPostgresPort } from "./SaasOnboardingService";
import { getSaasDashboardService } from "./SaasDashboardService";
import { isPgMissingRelation } from "./saasRequestContext";

export type CeoBriefMetrics = {
  activeJobs: number;
  completedJobs: number;
  totalSpend: number;
  contacts: number;
  openDeals: number;
  pipelineValue: number;
  pendingInbox: number;
  recentPackRuns: number;
  avgQaScore: number | null;
  autonomyMode: string;
};

export type CeoBrief = {
  tenantId: string;
  summaryText: string;
  metrics: CeoBriefMetrics;
  generatedAt: string;
};

export class SaasCeoBriefService {
  constructor(private readonly db: SaasPostgresPort = DbClient.getInstance()) {}

  async composeBrief(tenantId: string): Promise<CeoBrief> {
    const metrics = await this.gatherMetrics(tenantId);
    const lines: string[] = [
      `Buenos días. Resumen Nelvyon para hoy:`,
      `• Operaciones activas: ${metrics.activeJobs} | Completadas: ${metrics.completedJobs}`,
      `• Contactos CRM: ${metrics.contacts} | Deals abiertos: ${metrics.openDeals} (€${metrics.pipelineValue.toLocaleString("es-ES")})`,
      `• Inbox pendiente: ${metrics.pendingInbox} conversaciones`,
      `• Packs recientes (7d): ${metrics.recentPackRuns}${metrics.avgQaScore != null ? ` | QA medio: ${metrics.avgQaScore}` : ""}`,
      `• Modo autonomía: ${metrics.autonomyMode}`,
      metrics.pendingInbox > 5
        ? `⚠ Prioridad: revisar inbox (${metrics.pendingInbox} pendientes).`
        : `✓ Inbox bajo control.`,
    ];
    const summaryText = lines.join("\n");
    return { tenantId, summaryText, metrics, generatedAt: new Date().toISOString() };
  }

  async gatherMetrics(tenantId: string): Promise<CeoBriefMetrics> {
    let activeJobs = 0;
    let completedJobs = 0;
    let totalSpend = 0;
    try {
      const dash = await getSaasDashboardService().getDashboardSummary(tenantId);
      activeJobs = dash.activeJobs;
      completedJobs = dash.completedJobs;
      totalSpend = dash.totalSpend;
    } catch {
      /* dashboard optional */
    }

    const [contactsR, dealsR, inboxR, packsR, autonomyR] = await Promise.all([
      this.db.query<{ c: string }>(
        `SELECT COUNT(*)::text AS c FROM saas_contacts WHERE tenant_id = $1`,
        [tenantId],
      ),
      this.db.query<{ c: string; v: string | null }>(
        `SELECT COUNT(*)::text AS c, COALESCE(SUM(value), 0)::text AS v
         FROM saas_deals WHERE tenant_id = $1 AND stage NOT IN ('won','lost')`,
        [tenantId],
      ),
      this.db.query<{ c: string }>(
        `SELECT COUNT(*)::text AS c FROM saas_inbox_conversations
         WHERE tenant_id = $1 AND status IN ('open','pending')`,
        [tenantId],
      ).catch(() => [{ c: "0" }]),
      this.db.query<{ c: string; avg: string | null }>(
        `SELECT COUNT(*)::text AS c, AVG((report->>'avg_qa_score')::numeric)::text AS avg
         FROM nelvyon_pack_runs
         WHERE workspace_id = (SELECT workspace_id FROM saas_tenants WHERE id = $1 LIMIT 1)
           AND created_at > NOW() - INTERVAL '7 days'`,
        [tenantId],
      ).catch(() => [{ c: "0", avg: null }]),
      this.db.query<{ autonomy_mode: string }>(
        `SELECT autonomy_mode FROM saas_tenants WHERE id = $1 LIMIT 1`,
        [tenantId],
      ),
    ]);

    return {
      activeJobs,
      completedJobs,
      totalSpend,
      contacts: Number(contactsR[0]?.c ?? 0),
      openDeals: Number(dealsR[0]?.c ?? 0),
      pipelineValue: Number(dealsR[0]?.v ?? 0),
      pendingInbox: Number(inboxR[0]?.c ?? 0),
      recentPackRuns: Number(packsR[0]?.c ?? 0),
      avgQaScore: packsR[0]?.avg != null ? Math.round(Number(packsR[0].avg)) : null,
      autonomyMode: autonomyR[0]?.autonomy_mode ?? "propose",
    };
  }

  async recordRun(tenantId: string, brief: CeoBrief, deliveredVia: string[]): Promise<string> {
    try {
      const rows = await this.db.query<{ id: string }>(
        `INSERT INTO saas_ceo_brief_runs (tenant_id, summary_text, metrics_snapshot, delivered_via)
         VALUES ($1, $2, $3::jsonb, $4) RETURNING id`,
        [tenantId, brief.summaryText, JSON.stringify(brief.metrics), deliveredVia],
      );
      return rows[0]?.id ?? "";
    } catch (e) {
      if (isPgMissingRelation(e)) return "";
      throw e;
    }
  }

  async listTenantsForBrief(hourUtc: number): Promise<string[]> {
    try {
      const rows = await this.db.query<{ tenant_id: string }>(
        `SELECT s.tenant_id FROM saas_ceo_brief_settings s
         WHERE s.enabled = TRUE AND s.delivery_hour_utc = $1`,
        [hourUtc],
      );
      if (rows.length > 0) return rows.map((r) => r.tenant_id);
    } catch (e) {
      if (!isPgMissingRelation(e)) throw e;
    }
    const all = await this.db.query<{ id: string }>(
      `SELECT id FROM saas_tenants WHERE onboarding_completed = TRUE LIMIT 500`,
    );
    return all.map((r) => r.id);
  }

  async getLatestBrief(tenantId: string): Promise<CeoBrief | null> {
    try {
      const rows = await this.db.query<{ summary_text: string; metrics_snapshot: Record<string, unknown>; created_at: string }>(
        `SELECT summary_text, metrics_snapshot, created_at FROM saas_ceo_brief_runs
         WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 1`,
        [tenantId],
      );
      if (!rows[0]) return null;
      return {
        tenantId,
        summaryText: rows[0].summary_text,
        metrics: rows[0].metrics_snapshot as CeoBriefMetrics,
        generatedAt: rows[0].created_at,
      };
    } catch (e) {
      if (isPgMissingRelation(e)) return null;
      throw e;
    }
  }
}

let _svc: SaasCeoBriefService | undefined;
export function getSaasCeoBriefService(): SaasCeoBriefService {
  _svc ??= new SaasCeoBriefService();
  return _svc;
}
export function resetSaasCeoBriefServiceForTests(): void {
  _svc = undefined;
}
