import type { DbClient } from "../db/DbClient";
import { DbClient as DbClientClass } from "../db/DbClient";

export interface MRRMetrics {
  mrr: number;
  mrrGrowth: number;
  activeSubscriptions: number;
}

export interface ChurnMetrics {
  churnRate: number;
  cancelledLast30Days: number;
  totalActive: number;
}

export interface LTVMetrics {
  avgLTV: number;
  avgRevenuePerUser: number;
  avgLifespanMonths: number;
}

export interface ServiceMetrics {
  serviceType: string;
  totalJobs: number;
  successRate: number;
}

export interface AdminDashboard {
  mrr: MRRMetrics;
  churn: ChurnMetrics;
  ltv: LTVMetrics;
  topServices: ServiceMetrics[];
}

type CountRow = { count: string };
type RevenueRow = { mrr: string };
type ServiceRow = { service_type: string; total_jobs: string; success_rate: string };
type PlanRow = { plan: string };

export type AdminAnalyticsServiceDeps = {
  db?: Pick<DbClient, "query">;
};

function toNum(v: string | number | null | undefined): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

const PLAN_PRICE: Record<string, number> = {
  free: 0,
  starter: 97,
  pro: 197,
  enterprise: 497,
  admin: 0,
};

export class AdminAnalyticsService {
  constructor(private readonly deps: AdminAnalyticsServiceDeps = {}) {}

  private get db(): Pick<DbClient, "query"> {
    return this.deps.db ?? DbClientClass.getInstance();
  }

  async getMRR(): Promise<MRRMetrics> {
    const [currRows, prevRows, activeRows] = await Promise.all([
      this.db.query<RevenueRow>(
        `SELECT COALESCE(SUM(amount_eur), 0)::text AS mrr
         FROM os_service_contracts
         WHERE status = 'active'`,
      ),
      this.db.query<RevenueRow>(
        `SELECT COALESCE(SUM(amount_eur), 0)::text AS mrr
         FROM os_service_contracts
         WHERE status = 'active'
           AND created_at < date_trunc('month', NOW())`,
      ),
      this.db.query<CountRow>(
        `SELECT COUNT(*)::text AS count
         FROM os_service_contracts
         WHERE status = 'active'`,
      ),
    ]);

    const mrr = toNum(currRows[0]?.mrr);
    const previousMrr = toNum(prevRows[0]?.mrr);
    const mrrGrowth = previousMrr > 0 ? ((mrr - previousMrr) / previousMrr) * 100 : 0;
    const activeSubscriptions = toNum(activeRows[0]?.count);
    return { mrr, mrrGrowth, activeSubscriptions };
  }

  async getChurn(): Promise<ChurnMetrics> {
    const [cancelledRows, totalActiveRows] = await Promise.all([
      this.db.query<CountRow>(
        `SELECT COUNT(*)::text AS count
         FROM saas_contacts
         WHERE status = 'churned'
           AND updated_at >= NOW() - INTERVAL '30 days'`,
      ),
      this.db.query<CountRow>(
        `SELECT COUNT(*)::text AS count
         FROM saas_contacts
         WHERE status = 'client'`,
      ),
    ]);

    const cancelledLast30Days = toNum(cancelledRows[0]?.count);
    const totalActive = toNum(totalActiveRows[0]?.count);
    const churnRate = totalActive > 0 ? (cancelledLast30Days / totalActive) * 100 : 0;
    return { churnRate, cancelledLast30Days, totalActive };
  }

  async getLTV(): Promise<LTVMetrics> {
    const [mrrMetrics, userPlanRows] = await Promise.all([
      this.getMRR(),
      this.db.query<PlanRow>(`SELECT plan FROM nelvyon_users`),
    ]);

    const payingUsers = userPlanRows.filter((r) => (PLAN_PRICE[r.plan] ?? 0) > 0).length;
    const avgRevenuePerUser = payingUsers > 0 ? mrrMetrics.mrr / payingUsers : 0;
    const avgLifespanMonths = 18;
    const avgLTV = avgRevenuePerUser * avgLifespanMonths;
    return { avgLTV, avgRevenuePerUser, avgLifespanMonths };
  }

  async getTopServices(): Promise<ServiceMetrics[]> {
    const rows = await this.db.query<ServiceRow>(
      `SELECT service_id AS service_type,
              COUNT(*)::text AS total_jobs,
              COALESCE(
                (COUNT(*) FILTER (WHERE status = 'completed')::numeric / NULLIF(COUNT(*)::numeric, 0)) * 100,
                0
              )::text AS success_rate
       FROM os_jobs
       GROUP BY service_id
       ORDER BY COUNT(*) DESC
       LIMIT 10`,
    );

    return rows.map((row) => ({
      serviceType: row.service_type,
      totalJobs: toNum(row.total_jobs),
      successRate: toNum(row.success_rate),
    }));
  }

  async getDashboard(): Promise<AdminDashboard> {
    const [mrr, churn, ltv, topServices] = await Promise.all([this.getMRR(), this.getChurn(), this.getLTV(), this.getTopServices()]);
    return { mrr, churn, ltv, topServices };
  }

  async refreshCache(): Promise<void> {
    const dashboard = await this.getDashboard();
    await this.db.query(
      `INSERT INTO admin_metrics_cache (metric_key, metric_value, computed_at)
       VALUES ('dashboard', $1::jsonb, NOW())
       ON CONFLICT (metric_key)
       DO UPDATE SET metric_value = EXCLUDED.metric_value, computed_at = NOW()`,
      [JSON.stringify(dashboard)],
    );
  }
}

let cached: AdminAnalyticsService | undefined;

export function getAdminAnalyticsService(): AdminAnalyticsService {
  if (!cached) cached = new AdminAnalyticsService({ db: DbClientClass.getInstance() });
  return cached;
}

export function resetAdminAnalyticsServiceForTests(): void {
  cached = undefined;
}
