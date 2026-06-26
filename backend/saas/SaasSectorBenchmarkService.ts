/**
 * S51 — SaasSectorBenchmarkService
 * Auto-collects tenant KPIs and compares them against industry medians.
 *
 * Industry data comes from backend/os-agents/benchmarks/industryBenchmarks.ts
 * (Google/Meta Ads + email marketing medians per sector). Client metrics are
 * collected automatically from saas_campanias, saas_lead_attribution, crm_deals,
 * saas_ads_metrics_cache and nelvyon_pack_runs — no manual input required.
 */
import type { SaasPostgresPort } from "./SaasOnboardingService";
import { getBenchmark, resolveIndustryKey } from "../os-agents/benchmarks/industryBenchmarks";

// ── Types ───────────────────────────────────────────────────────────────────────

export type BenchmarkMetricKey =
  | "email_open_rate"
  | "email_click_rate"
  | "conversion_rate"
  | "roas"
  | "cpc"
  | "qa_score";

export type BenchmarkRating = "excelente" | "bueno" | "mejorable" | "critico" | "sin_dato";

export type ClientMetricValue = {
  key: BenchmarkMetricKey;
  label: string;
  value: number | null;
  unit: "%" | "x" | "€" | "pts";
  source: string;
};

export type BenchmarkComparison = {
  key: BenchmarkMetricKey;
  label: string;
  clientValue: number | null;
  industryValue: number | null;
  unit: "%" | "x" | "€" | "pts";
  deltaPct: number | null;
  higherBetter: boolean;
  rating: BenchmarkRating;
};

export type BenchmarkSummary = {
  metricsTracked: number;
  metricsCompared: number;
  aboveIndustry: number;
  belowIndustry: number;
  overallScore: number; // 0-100, share of compared metrics at/above industry
};

export type BenchmarkDashboard = {
  tenantId: string;
  sectorKey: string;
  sectorLabel: string;
  periodDays: number;
  clientMetrics: ClientMetricValue[];
  industryMetrics: Partial<Record<BenchmarkMetricKey, number | null>>;
  comparisons: BenchmarkComparison[];
  summary: BenchmarkSummary;
  dataSources: string[];
  degraded: boolean;
  computedAt: string;
};

export type SectorOption = { key: string; label: string };

export type SaasSectorBenchmarkErrorCode = "NOT_FOUND" | "VALIDATION";

export class SaasSectorBenchmarkError extends Error {
  constructor(
    public readonly code: SaasSectorBenchmarkErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "SaasSectorBenchmarkError";
  }
}

// ── Metric definitions ──────────────────────────────────────────────────────────

type MetricDef = {
  key: BenchmarkMetricKey;
  label: string;
  unit: "%" | "x" | "€" | "pts";
  channel: string | null; // null → no industry benchmark
  metric: string | null;
  higherBetter: boolean;
  source: string;
};

const METRIC_DEFS: readonly MetricDef[] = [
  { key: "email_open_rate", label: "Tasa de apertura email", unit: "%", channel: "emailMarketing", metric: "averageOpenRate", higherBetter: true, source: "Campañas email" },
  { key: "email_click_rate", label: "Tasa de clics email", unit: "%", channel: "emailMarketing", metric: "averageClickRate", higherBetter: true, source: "Campañas email" },
  { key: "conversion_rate", label: "Tasa de conversión", unit: "%", channel: "googleAds", metric: "averageConversionRate", higherBetter: true, source: "Atribución de leads" },
  { key: "roas", label: "ROAS publicidad", unit: "x", channel: "metaAds", metric: "averageROAS", higherBetter: true, source: "Métricas de ads" },
  { key: "cpc", label: "Coste por clic", unit: "€", channel: "googleAds", metric: "averageCPC", higherBetter: false, source: "Métricas de ads" },
  { key: "qa_score", label: "QA media entregables", unit: "pts", channel: null, metric: null, higherBetter: true, source: "Pack runs" },
] as const;

// Sectors exposed in the UI selector (subset known to industryBenchmarks).
const SECTOR_LABELS: Record<string, string> = {
  ecommerce: "E-commerce",
  retail: "Retail",
  finance: "Finanzas",
  health: "Salud",
  legal: "Legal",
  realestate: "Inmobiliaria",
  education: "Educación",
  travel: "Viajes / Turismo",
  technology: "Tecnología",
  restaurants: "Restauración",
  automotive: "Automoción",
  b2b: "B2B / SaaS",
  nonprofit: "ONG",
  fashion: "Moda",
  default: "General",
};

function sectorLabel(key: string): string {
  return SECTOR_LABELS[key] ?? "General";
}

function round(value: number, decimals = 4): number {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}

// ── Singleton ───────────────────────────────────────────────────────────────────

let _instance: SaasSectorBenchmarkService | null = null;

export function getSaasSectorBenchmarkService(): SaasSectorBenchmarkService {
  if (!_instance) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { DbClient } = require("../db/DbClient") as {
      DbClient: { getInstance(): SaasPostgresPort };
    };
    _instance = new SaasSectorBenchmarkService(DbClient.getInstance());
  }
  return _instance;
}

export function resetSaasSectorBenchmarkServiceForTests(): void {
  _instance = null;
}

// ── Service ─────────────────────────────────────────────────────────────────────

export class SaasSectorBenchmarkService {
  constructor(private readonly db: SaasPostgresPort) {}

  /** Sectors offered in the UI selector. */
  listSectors(): SectorOption[] {
    return Object.entries(SECTOR_LABELS)
      .filter(([key]) => key !== "default")
      .map(([key, label]) => ({ key, label }));
  }

  /** Resolve the tenant's sector key from saas_tenants.industry. */
  async resolveTenantSector(tenantId: string): Promise<{ key: string; label: string }> {
    const rows = await this.db.query<{ industry: string | null }>(
      `SELECT industry FROM saas_tenants WHERE id = $1 LIMIT 1`,
      [tenantId],
    );
    const industry = rows[0]?.industry ?? "";
    const key = resolveIndustryKey({ industry });
    return { key, label: sectorLabel(key) };
  }

  /** Auto-collect tenant KPIs for the period (best-effort; missing data → null). */
  async collectClientMetrics(
    tenantId: string,
    periodDays = 30,
  ): Promise<{ metrics: ClientMetricValue[]; sources: string[]; degraded: boolean }> {
    const days = String(Math.max(1, periodDays));
    const values = new Map<BenchmarkMetricKey, number | null>();
    const sources = new Set<string>();

    // Email open/click rate ── saas_campanias
    try {
      const rows = await this.db.query<{ sent: string; opened: string; clicked: string }>(
        `SELECT
           COALESCE(SUM(sent_count), 0)    AS sent,
           COALESCE(SUM(opened_count), 0)  AS opened,
           COALESCE(SUM(clicked_count), 0) AS clicked
         FROM saas_campanias
         WHERE tenant_id = $1
           AND created_at >= NOW() - ($2 || ' days')::INTERVAL`,
        [tenantId, days],
      );
      const sent = parseInt(rows[0]?.sent ?? "0", 10);
      if (sent > 0) {
        values.set("email_open_rate", round(parseInt(rows[0]!.opened, 10) / sent));
        values.set("email_click_rate", round(parseInt(rows[0]!.clicked, 10) / sent));
        sources.add("Campañas email");
      }
    } catch { /* table missing or empty — leave null */ }

    // Conversion rate ── saas_lead_attribution (conversions / visits)
    try {
      const rows = await this.db.query<{ visits: string; conversions: string }>(
        `SELECT
           COUNT(*) FILTER (WHERE event_type='visit')      AS visits,
           COUNT(*) FILTER (WHERE event_type='conversion') AS conversions
         FROM saas_lead_attribution
         WHERE tenant_id = $1
           AND created_at >= NOW() - ($2 || ' days')::INTERVAL`,
        [tenantId, days],
      );
      const visits = parseInt(rows[0]?.visits ?? "0", 10);
      if (visits > 0) {
        values.set("conversion_rate", round(parseInt(rows[0]!.conversions, 10) / visits));
        sources.add("Atribución de leads");
      }
    } catch { /* leave null */ }

    // ROAS + CPC ── saas_ads_metrics_cache (aggregate spend / clicks / conversions)
    try {
      const rows = await this.db.query<{ spend: string; clicks: string; conversions: string; revenue: string }>(
        `SELECT
           COALESCE(SUM(c.spend::numeric), 0)       AS spend,
           COALESCE(SUM(c.clicks::numeric), 0)      AS clicks,
           COALESCE(SUM(c.conversions::numeric), 0) AS conversions,
           COALESCE(SUM(c.revenue::numeric), 0)     AS revenue
         FROM saas_ads_metrics_cache c
         JOIN saas_ads_connections a ON a.id = c.connection_id
         WHERE a.tenant_id = $1
           AND c.date_start >= NOW() - ($2 || ' days')::INTERVAL`,
        [tenantId, days],
      );
      const spend = parseFloat(rows[0]?.spend ?? "0") || 0;
      const clicks = parseFloat(rows[0]?.clicks ?? "0") || 0;
      const revenue = parseFloat(rows[0]?.revenue ?? "0") || 0;
      if (spend > 0) {
        if (revenue > 0) values.set("roas", round(revenue / spend, 2));
        if (clicks > 0) values.set("cpc", round(spend / clicks, 2));
        sources.add("Métricas de ads");
      }
    } catch { /* leave null */ }

    // QA score ── nelvyon_pack_runs via workspace_id bridge
    try {
      const rows = await this.db.query<{ avg_qa: string | null }>(
        `SELECT AVG((report->>'qaScore')::numeric) AS avg_qa
         FROM nelvyon_pack_runs r
         JOIN saas_tenants t ON t.workspace_id = r.workspace_id
         WHERE t.id = $1
           AND r.report ? 'qaScore'
           AND r.created_at >= NOW() - ($2 || ' days')::INTERVAL`,
        [tenantId, days],
      );
      const avgQa = rows[0]?.avg_qa ? parseFloat(rows[0].avg_qa) : null;
      if (avgQa !== null && !isNaN(avgQa)) {
        values.set("qa_score", round(avgQa, 1));
        sources.add("Pack runs");
      }
    } catch { /* leave null */ }

    const metrics: ClientMetricValue[] = METRIC_DEFS.map((def) => ({
      key: def.key,
      label: def.label,
      value: values.has(def.key) ? values.get(def.key)! : null,
      unit: def.unit,
      source: def.source,
    }));

    const collected = metrics.filter((m) => m.value !== null).length;
    return { metrics, sources: [...sources], degraded: collected === 0 };
  }

  /** Industry medians for the sector keyed by metric. */
  getIndustryMetrics(sectorKey: string): Partial<Record<BenchmarkMetricKey, number | null>> {
    const out: Partial<Record<BenchmarkMetricKey, number | null>> = {};
    for (const def of METRIC_DEFS) {
      if (!def.channel || !def.metric) {
        out[def.key] = null;
        continue;
      }
      out[def.key] = getBenchmark(def.channel, def.metric, sectorKey);
    }
    return out;
  }

  /** Compare collected client metrics against industry medians. */
  compareMetrics(
    clientMetrics: ClientMetricValue[],
    industryMetrics: Partial<Record<BenchmarkMetricKey, number | null>>,
  ): BenchmarkComparison[] {
    const byKey = new Map(clientMetrics.map((m) => [m.key, m]));
    return METRIC_DEFS.map((def) => {
      const client = byKey.get(def.key)?.value ?? null;
      const industry = industryMetrics[def.key] ?? null;

      let deltaPct: number | null = null;
      let rating: BenchmarkRating = "sin_dato";

      if (client !== null && industry !== null && industry !== 0) {
        const rawDelta = ((client - industry) / industry) * 100;
        // For "lower is better" metrics, invert so positive delta always = good.
        const effective = def.higherBetter ? rawDelta : -rawDelta;
        deltaPct = round(rawDelta, 1);
        rating =
          effective > 15 ? "excelente" : effective >= 0 ? "bueno" : effective > -15 ? "mejorable" : "critico";
      }

      return {
        key: def.key,
        label: def.label,
        clientValue: client,
        industryValue: industry,
        unit: def.unit,
        deltaPct,
        higherBetter: def.higherBetter,
        rating,
      };
    });
  }

  /** Build the full benchmark dashboard (auto-collect → compare → summarize). */
  async buildDashboard(
    tenantId: string,
    opts?: { periodDays?: number; sectorKey?: string },
  ): Promise<BenchmarkDashboard> {
    const periodDays = opts?.periodDays ?? 30;
    const resolved = await this.resolveTenantSector(tenantId);
    const sectorKey = opts?.sectorKey ?? resolved.key;
    const label = opts?.sectorKey ? sectorLabel(opts.sectorKey) : resolved.label;

    const { metrics, sources, degraded } = await this.collectClientMetrics(tenantId, periodDays);
    const industryMetrics = this.getIndustryMetrics(sectorKey);
    const comparisons = this.compareMetrics(metrics, industryMetrics);

    const compared = comparisons.filter((c) => c.rating !== "sin_dato");
    const above = compared.filter((c) => c.rating === "excelente" || c.rating === "bueno").length;
    const below = compared.length - above;
    const summary: BenchmarkSummary = {
      metricsTracked: metrics.filter((m) => m.value !== null).length,
      metricsCompared: compared.length,
      aboveIndustry: above,
      belowIndustry: below,
      overallScore: compared.length > 0 ? Math.round((above / compared.length) * 100) : 0,
    };

    return {
      tenantId,
      sectorKey,
      sectorLabel: label,
      periodDays,
      clientMetrics: metrics,
      industryMetrics,
      comparisons,
      summary,
      dataSources: sources,
      degraded,
      computedAt: new Date().toISOString(),
    };
  }

  // ── Snapshots ─────────────────────────────────────────────────────────────

  async saveSnapshot(dashboard: BenchmarkDashboard): Promise<string> {
    const rows = await this.db.query<{ id: string }>(
      `INSERT INTO saas_benchmark_snapshots
         (tenant_id, sector_key, sector_label, period_days,
          client_metrics, industry_metrics, comparisons, summary, data_sources, degraded)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING id`,
      [
        dashboard.tenantId,
        dashboard.sectorKey,
        dashboard.sectorLabel,
        dashboard.periodDays,
        JSON.stringify(dashboard.clientMetrics),
        JSON.stringify(dashboard.industryMetrics),
        JSON.stringify(dashboard.comparisons),
        JSON.stringify(dashboard.summary),
        JSON.stringify(dashboard.dataSources),
        dashboard.degraded,
      ],
    );
    return rows[0]!.id;
  }

  async getLatestSnapshot(tenantId: string): Promise<BenchmarkDashboard | null> {
    const rows = await this.db.query<{
      tenant_id: string;
      sector_key: string;
      sector_label: string;
      period_days: number;
      client_metrics: ClientMetricValue[];
      industry_metrics: Partial<Record<BenchmarkMetricKey, number | null>>;
      comparisons: BenchmarkComparison[];
      summary: BenchmarkSummary;
      data_sources: string[];
      degraded: boolean;
      computed_at: string;
    }>(
      `SELECT * FROM saas_benchmark_snapshots
       WHERE tenant_id = $1
       ORDER BY computed_at DESC
       LIMIT 1`,
      [tenantId],
    );
    const r = rows[0];
    if (!r) return null;
    return {
      tenantId: r.tenant_id,
      sectorKey: r.sector_key,
      sectorLabel: r.sector_label,
      periodDays: r.period_days,
      clientMetrics: r.client_metrics ?? [],
      industryMetrics: r.industry_metrics ?? {},
      comparisons: r.comparisons ?? [],
      summary: r.summary,
      dataSources: r.data_sources ?? [],
      degraded: r.degraded,
      computedAt: r.computed_at,
    };
  }

  /** Recompute and persist a fresh snapshot. */
  async refreshBenchmark(
    tenantId: string,
    opts?: { periodDays?: number; sectorKey?: string },
  ): Promise<BenchmarkDashboard> {
    const dashboard = await this.buildDashboard(tenantId, opts);
    await this.saveSnapshot(dashboard);
    return dashboard;
  }
}
