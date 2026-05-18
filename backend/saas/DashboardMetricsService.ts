import type { DbClient } from "../db/DbClient";
import { DbClient as DbClientClass } from "../db/DbClient";
import { getGA4Service } from "../integrations/GoogleAnalytics4Service";
import type { GoogleAnalytics4Service } from "../integrations/GoogleAnalytics4Service";

export type ROIChartData = { date: string; revenue: number; spend: number; roi: number };
export type TrafficChartData = { date: string; sessions: number; users: number; conversions: number };
export type ConversionChartData = { name: string; value: number; percentage: number };
export type MRRChartData = { month: string; mrr: number; growth: number };

export type DashboardSummary = {
  roi: ROIChartData[];
  traffic: TrafficChartData[];
  conversions: ConversionChartData[];
  mrr: MRRChartData[];
};

export type DashboardMetricsServiceDeps = {
  db?: Pick<DbClient, "query">;
  ga4Service?: Pick<GoogleAnalytics4Service, "runReport">;
};

function num(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function ymd(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function rangeDays(days: number): { start: string; end: string } {
  const end = new Date();
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - (days - 1));
  return { start: ymd(start), end: ymd(end) };
}

export class DashboardMetricsService {
  constructor(private readonly deps: DashboardMetricsServiceDeps = {}) {}

  private get db(): Pick<DbClient, "query"> {
    return this.deps.db ?? DbClientClass.getInstance();
  }

  private get ga4(): Pick<GoogleAnalytics4Service, "runReport"> {
    return this.deps.ga4Service ?? getGA4Service();
  }

  async getROIMetrics(userId: string, dateRange?: { start: string; end: string }): Promise<ROIChartData[]> {
    const range = dateRange ?? rangeDays(30);
    const revRows = await this.db.query<{ date: string; revenue: string }>(
      `SELECT TO_CHAR(DATE_TRUNC('day', created_at), 'YYYY-MM-DD') as date,
         COALESCE(SUM(revenue), 0)::text as revenue
       FROM roi_conversions
       WHERE user_id = $1::uuid AND created_at BETWEEN $2::timestamptz AND $3::timestamptz
       GROUP BY 1
       ORDER BY 1 ASC`,
      [userId, `${range.start}T00:00:00.000Z`, `${range.end}T23:59:59.999Z`],
    );
    const spendRows = await this.db.query<{ date: string; spend: string }>(
      `SELECT TO_CHAR(DATE_TRUNC('day', created_at), 'YYYY-MM-DD') as date,
         COALESCE(SUM(CASE
           WHEN metadata ? 'spend' THEN (metadata->>'spend')::numeric
           ELSE 0
         END), 0)::text as spend
       FROM roi_events
       WHERE user_id = $1::uuid
         AND created_at BETWEEN $2::timestamptz AND $3::timestamptz
       GROUP BY 1
       ORDER BY 1 ASC`,
      [userId, `${range.start}T00:00:00.000Z`, `${range.end}T23:59:59.999Z`],
    );
    const revenueByDate = new Map(revRows.map((r) => [r.date, num(r.revenue)]));
    const spendByDate = new Map(spendRows.map((r) => [r.date, num(r.spend)]));
    const dates = [...new Set([...revenueByDate.keys(), ...spendByDate.keys()])].sort();
    return dates.map((date) => {
      const revenue = revenueByDate.get(date) ?? 0;
      const spend = spendByDate.get(date) ?? 0;
      const roi = spend > 0 ? ((revenue - spend) / spend) * 100 : 0;
      return { date, revenue, spend, roi };
    });
  }

  async getTrafficMetrics(userId: string, dateRange?: { start: string; end: string }): Promise<TrafficChartData[]> {
    const range = dateRange ?? rangeDays(30);
    const ga4Rows = await this.db.query<{ property_id: string }>(
      `SELECT property_id
       FROM integration_ga4
       WHERE user_id = $1::uuid AND is_active = true
       LIMIT 1`,
      [userId],
    );
    if (ga4Rows[0]?.property_id) {
      try {
        const rows = await this.ga4.runReport(
          userId,
          { startDate: range.start, endDate: range.end },
          ["date"],
          ["sessions", "activeUsers", "conversions"],
        );
        return rows.map((r) => ({
          date: r.dimensions.date ?? "",
          sessions: Math.round(num(r.metrics.sessions)),
          users: Math.round(num(r.metrics.activeUsers)),
          conversions: Math.round(num(r.metrics.conversions)),
        }));
      } catch {
        // fallback a os_jobs
      }
    }
    const rows = await this.db.query<{ date: string; sessions: string; users: string; conversions: string }>(
      `SELECT TO_CHAR(DATE_TRUNC('day', created_at), 'YYYY-MM-DD') as date,
         COUNT(*)::text as sessions,
         COUNT(*)::text as users,
         COALESCE(SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END), 0)::text as conversions
       FROM os_jobs
       WHERE client_id = $1 AND created_at BETWEEN $2::timestamptz AND $3::timestamptz
       GROUP BY 1
       ORDER BY 1 ASC`,
      [userId, `${range.start}T00:00:00.000Z`, `${range.end}T23:59:59.999Z`],
    );
    return rows.map((r) => ({
      date: r.date,
      sessions: Math.round(num(r.sessions)),
      users: Math.round(num(r.users)),
      conversions: Math.round(num(r.conversions)),
    }));
  }

  async getConversionMetrics(userId: string): Promise<ConversionChartData[]> {
    const rows = await this.db.query<{ name: string; value: string }>(
      `SELECT COALESCE(conversion_type, 'unknown') as name, COUNT(*)::text as value
       FROM roi_conversions
       WHERE user_id = $1::uuid
       GROUP BY 1
       ORDER BY COUNT(*) DESC`,
      [userId],
    );
    const total = rows.reduce((acc, r) => acc + num(r.value), 0);
    return rows.map((r) => ({
      name: r.name,
      value: Math.round(num(r.value)),
      percentage: total > 0 ? (num(r.value) / total) * 100 : 0,
    }));
  }

  async getMRRMetrics(userId: string, months = 6): Promise<MRRChartData[]> {
    const m = Math.max(1, Math.min(24, Math.round(months)));
    const rows = await this.db.query<{ month: string; mrr: string }>(
      `SELECT TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') as month,
         COALESCE(SUM(amount_eur), 0)::text as mrr
       FROM saas_invoices
       WHERE user_id = $1::uuid
         AND created_at >= NOW() - ($2::int || ' months')::interval
       GROUP BY 1
       ORDER BY 1 ASC`,
      [userId, m],
    );
    let prev = 0;
    return rows.map((r) => {
      const value = num(r.mrr);
      const growth = prev > 0 ? ((value - prev) / prev) * 100 : 0;
      prev = value;
      return { month: r.month, mrr: value, growth };
    });
  }

  async getDashboardSummary(userId: string): Promise<DashboardSummary> {
    const [roi, traffic, conversions, mrr] = await Promise.all([
      this.getROIMetrics(userId),
      this.getTrafficMetrics(userId),
      this.getConversionMetrics(userId),
      this.getMRRMetrics(userId),
    ]);
    return { roi, traffic, conversions, mrr };
  }
}

let cachedDashboardMetricsService: DashboardMetricsService | undefined;

export function getDashboardMetricsService(): DashboardMetricsService {
  if (!cachedDashboardMetricsService) cachedDashboardMetricsService = new DashboardMetricsService();
  return cachedDashboardMetricsService;
}

export function resetDashboardMetricsServiceForTests(): void {
  cachedDashboardMetricsService = undefined;
}
