import type { SaasPostgresPort } from "./SaasOnboardingService";

// ── Types ─────────────────────────────────────────────────────────────────────

export type RevenueAttributionModel = "last_touch" | "first_touch" | "linear";

export interface DeliverableLink {
  tenantId: string;
  deliverableId: string;
  deliverableSource: "os" | "recurring" | "pack_run";
  utmCampaign: string | null;
  externalCampaignId: string | null;
  landingUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LinkDeliverableInput {
  deliverableSource: "os" | "recurring" | "pack_run";
  utmCampaign?: string;
  externalCampaignId?: string;
  landingUrl?: string;
}

export interface DeliverableRevenue {
  id: string;
  tenantId: string;
  deliverableId: string;
  deliverableSource: "os" | "recurring" | "pack_run";
  packId: string | null;
  utmCampaign: string | null;
  periodStart: string;
  periodEnd: string;
  visits: number;
  conversions: number;
  attributedRevenue: number;
  adsSpend: number;
  roas: number | null;
  model: RevenueAttributionModel;
  computedAt: string;
}

export interface DeliverableRevenueWithMeta extends DeliverableRevenue {
  title?: string;
  type?: string;
}

export interface PackRevenueSummary {
  packId: string;
  totalConversions: number;
  totalAttributedRevenue: number;
  totalAdsSpend: number;
  avgRoas: number | null;
  deliverableCount: number;
}

export class SaasDeliverableRevenueError extends Error {
  constructor(message: string, public code: "NOT_FOUND" | "VALIDATION") {
    super(message);
    this.name = "SaasDeliverableRevenueError";
  }
}

// ── Revenue row DB type ───────────────────────────────────────────────────────

interface RevenueRow {
  id: string;
  tenant_id: string;
  deliverable_id: string;
  deliverable_source: string;
  pack_id: string | null;
  utm_campaign: string | null;
  period_start: string;
  period_end: string;
  visits: number;
  conversions: number;
  attributed_revenue: string;
  ads_spend: string;
  roas: string | null;
  model: string;
  computed_at: string;
}

interface LinkRow {
  tenant_id: string;
  deliverable_id: string;
  deliverable_source: string;
  utm_campaign: string | null;
  external_campaign_id: string | null;
  landing_url: string | null;
  created_at: string;
  updated_at: string;
}

// ── Mappers ───────────────────────────────────────────────────────────────────

function rowToRevenue(r: RevenueRow): DeliverableRevenue {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    deliverableId: r.deliverable_id,
    deliverableSource: r.deliverable_source as DeliverableRevenue["deliverableSource"],
    packId: r.pack_id,
    utmCampaign: r.utm_campaign,
    periodStart: r.period_start,
    periodEnd: r.period_end,
    visits: Number(r.visits),
    conversions: Number(r.conversions),
    attributedRevenue: parseFloat(r.attributed_revenue),
    adsSpend: parseFloat(r.ads_spend),
    roas: r.roas !== null ? parseFloat(r.roas) : null,
    model: r.model as RevenueAttributionModel,
    computedAt: r.computed_at,
  };
}

function rowToLink(r: LinkRow): DeliverableLink {
  return {
    tenantId: r.tenant_id,
    deliverableId: r.deliverable_id,
    deliverableSource: r.deliverable_source as DeliverableLink["deliverableSource"],
    utmCampaign: r.utm_campaign,
    externalCampaignId: r.external_campaign_id,
    landingUrl: r.landing_url,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

// ── Default revenue per conversion (env fallback) ─────────────────────────────

function defaultRevenuePerConversion(): number {
  const env = process.env.REVENUE_PER_CONVERSION_DEFAULT;
  return env ? parseFloat(env) : 500; // €500 default deal value
}

// ── Service ───────────────────────────────────────────────────────────────────

export class SaasDeliverableRevenueService {
  constructor(private readonly db: SaasPostgresPort) {}

  async linkDeliverable(
    tenantId: string,
    deliverableId: string,
    input: LinkDeliverableInput,
  ): Promise<DeliverableLink> {
    if (!deliverableId.trim()) {
      throw new SaasDeliverableRevenueError("deliverableId is required", "VALIDATION");
    }

    const rows = await this.db.query<LinkRow>(
      `INSERT INTO saas_deliverable_links
         (tenant_id, deliverable_id, deliverable_source, utm_campaign, external_campaign_id, landing_url, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT (tenant_id, deliverable_id) DO UPDATE SET
         utm_campaign = EXCLUDED.utm_campaign,
         external_campaign_id = EXCLUDED.external_campaign_id,
         landing_url = EXCLUDED.landing_url,
         updated_at = NOW()
       RETURNING *`,
      [
        tenantId,
        deliverableId,
        input.deliverableSource,
        input.utmCampaign ?? null,
        input.externalCampaignId ?? null,
        input.landingUrl ?? null,
      ],
    );
    return rowToLink(rows[0]!);
  }

  async computeRevenue(
    tenantId: string,
    deliverableId: string,
    days = 30,
    model: RevenueAttributionModel = "last_touch",
    packId?: string,
  ): Promise<DeliverableRevenue> {
    // Resolve utm_campaign: from explicit link or metadata
    const linkRows = await this.db.query<LinkRow>(
      `SELECT * FROM saas_deliverable_links WHERE tenant_id=$1 AND deliverable_id=$2 LIMIT 1`,
      [tenantId, deliverableId],
    );
    const link = linkRows[0] ? rowToLink(linkRows[0]) : null;
    const utmCampaign = link?.utmCampaign ?? null;
    const source = link?.deliverableSource ?? "pack_run";

    // Pull campaign conversions + visits from attribution data
    let visits = 0;
    let conversions = 0;

    if (utmCampaign) {
      const attrRows = await this.db.query<{ visits: string; conversions: string }>(
        `SELECT
           COUNT(*) FILTER (WHERE event_type='visit')      AS visits,
           COUNT(*) FILTER (WHERE event_type='conversion') AS conversions
         FROM saas_lead_attribution
         WHERE tenant_id=$1
           AND utm_campaign=$2
           AND created_at >= NOW() - ($3 || ' days')::INTERVAL`,
        [tenantId, utmCampaign, String(days)],
      );
      if (attrRows[0]) {
        visits = parseInt(attrRows[0].visits) || 0;
        conversions = parseInt(attrRows[0].conversions) || 0;
      }
    }

    // Estimate attributed revenue: conversions × avg deal value
    let avgDealValue = defaultRevenuePerConversion();
    const dealRows = await this.db.query<{ avg_value: string }>(
      `SELECT AVG(value::numeric) AS avg_value
       FROM crm_deals
       WHERE tenant_id=$1 AND value > 0
         AND created_at >= NOW() - ($2 || ' days')::INTERVAL`,
      [tenantId, String(days)],
    );
    if (dealRows[0]?.avg_value) {
      const parsed = parseFloat(dealRows[0].avg_value);
      if (!isNaN(parsed) && parsed > 0) avgDealValue = parsed;
    }

    const attributedRevenue = conversions * avgDealValue;

    // Pull ads spend from cache by utm_campaign
    let adsSpend = 0;
    if (utmCampaign) {
      const spendRows = await this.db.query<{ total_spend: string }>(
        `SELECT SUM(c.spend::numeric) AS total_spend
         FROM saas_ads_metrics_cache c
         JOIN saas_ads_connections a ON a.id = c.connection_id
         JOIN saas_ads_campaign_links l ON l.tenant_id = a.tenant_id
         WHERE a.tenant_id=$1
           AND l.utm_campaign=$2
           AND c.date_start >= NOW() - ($3 || ' days')::INTERVAL`,
        [tenantId, utmCampaign, String(days)],
      );
      if (spendRows[0]?.total_spend) {
        adsSpend = parseFloat(spendRows[0].total_spend) || 0;
      }
    }

    const roas = adsSpend > 0 ? Math.round((attributedRevenue / adsSpend) * 10000) / 10000 : null;

    const now = new Date();
    const periodEnd = now.toISOString().slice(0, 10);
    const periodStart = new Date(now.getTime() - days * 86_400_000).toISOString().slice(0, 10);

    const rows = await this.db.query<RevenueRow>(
      `INSERT INTO saas_deliverable_revenue
         (tenant_id, deliverable_id, deliverable_source, pack_id, utm_campaign,
          period_start, period_end, visits, conversions, attributed_revenue,
          ads_spend, roas, model, computed_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW())
       ON CONFLICT (tenant_id, deliverable_id, period_start, period_end, model) DO UPDATE SET
         visits = EXCLUDED.visits,
         conversions = EXCLUDED.conversions,
         attributed_revenue = EXCLUDED.attributed_revenue,
         ads_spend = EXCLUDED.ads_spend,
         roas = EXCLUDED.roas,
         computed_at = NOW()
       RETURNING *`,
      [
        tenantId, deliverableId, source, packId ?? null, utmCampaign,
        periodStart, periodEnd, visits, conversions,
        attributedRevenue.toFixed(2), adsSpend.toFixed(2), roas, model,
      ],
    );

    return rowToRevenue(rows[0]!);
  }

  async listRevenueByDeliverable(
    tenantId: string,
    days = 30,
    model: RevenueAttributionModel = "last_touch",
  ): Promise<DeliverableRevenueWithMeta[]> {
    const rows = await this.db.query<RevenueRow>(
      `SELECT * FROM saas_deliverable_revenue
       WHERE tenant_id=$1
         AND model=$2
         AND period_start >= NOW() - ($3 || ' days')::INTERVAL
       ORDER BY attributed_revenue DESC, computed_at DESC
       LIMIT 200`,
      [tenantId, model, String(days)],
    );
    return rows.map((r) => rowToRevenue(r) as DeliverableRevenueWithMeta);
  }

  async getPackRevenueSummary(
    tenantId: string,
    packId: string,
    days = 30,
  ): Promise<PackRevenueSummary> {
    const rows = await this.db.query<{
      pack_id: string;
      total_conversions: string;
      total_revenue: string;
      total_spend: string;
      deliverable_count: string;
    }>(
      `SELECT
         pack_id,
         SUM(conversions)          AS total_conversions,
         SUM(attributed_revenue)   AS total_revenue,
         SUM(ads_spend)            AS total_spend,
         COUNT(DISTINCT deliverable_id) AS deliverable_count
       FROM saas_deliverable_revenue
       WHERE tenant_id=$1 AND pack_id=$2
         AND period_start >= NOW() - ($3 || ' days')::INTERVAL
       GROUP BY pack_id`,
      [tenantId, packId, String(days)],
    );

    if (!rows[0]) {
      return {
        packId,
        totalConversions: 0,
        totalAttributedRevenue: 0,
        totalAdsSpend: 0,
        avgRoas: null,
        deliverableCount: 0,
      };
    }

    const r = rows[0];
    const revenue = parseFloat(r.total_revenue ?? "0");
    const spend = parseFloat(r.total_spend ?? "0");
    return {
      packId: r.pack_id,
      totalConversions: parseInt(r.total_conversions ?? "0"),
      totalAttributedRevenue: revenue,
      totalAdsSpend: spend,
      avgRoas: spend > 0 ? Math.round((revenue / spend) * 100) / 100 : null,
      deliverableCount: parseInt(r.deliverable_count ?? "0"),
    };
  }

  async refreshAll(
    tenantId: string,
    days = 30,
    model: RevenueAttributionModel = "last_touch",
  ): Promise<{ refreshed: number; errors: string[] }> {
    // Get all linked deliverables for this tenant
    const links = await this.db.query<LinkRow>(
      `SELECT * FROM saas_deliverable_links WHERE tenant_id=$1`,
      [tenantId],
    );

    let refreshed = 0;
    const errors: string[] = [];

    for (const link of links) {
      try {
        await this.computeRevenue(tenantId, link.deliverable_id, days, model);
        refreshed++;
      } catch (e) {
        errors.push(`${link.deliverable_id}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    return { refreshed, errors };
  }
}

// ── Singleton ─────────────────────────────────────────────────────────────────

let _instance: SaasDeliverableRevenueService | null = null;

export function getSaasDeliverableRevenueService(): SaasDeliverableRevenueService {
  if (!_instance) {
    const { DbClient } = require("../db/DbClient") as { DbClient: { getInstance(): SaasPostgresPort } };
    _instance = new SaasDeliverableRevenueService(DbClient.getInstance());
  }
  return _instance;
}

export function resetSaasDeliverableRevenueServiceForTests(): void {
  _instance = null;
}
