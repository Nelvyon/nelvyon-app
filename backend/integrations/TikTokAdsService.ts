import type { DbClient } from "../db/DbClient";
import { DbClient as DbClientClass } from "../db/DbClient";
import { OsAgentError } from "../os-agents/OsAgentError";

const BASE = "https://business-api.tiktok.com/open_api/v1.3";

export interface TikTokAdsCredentials {
  userId: string;
  advertiserId: string;
  accessToken: string;
  isActive: boolean;
}

export interface TikTokCampaign {
  campaignId: string;
  campaignName: string;
  status: string;
  budget: number;
  objective: string;
}

export interface TikTokCampaignMetrics {
  campaignId: string;
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
  ctr: number;
  cpc: number;
}

export interface TikTokAccountSummary {
  totalSpend: number;
  impressions: number;
  clicks: number;
  conversions: number;
}

export interface TikTokAudienceInsights {
  ageBreakdown: ReadonlyArray<{ ageRange: string; percentage?: number; count?: number }>;
  genderBreakdown: ReadonlyArray<{ gender: string; percentage?: number; count?: number }>;
  countryBreakdown: ReadonlyArray<{ country: string; percentage?: number; count?: number }>;
}

export type TikTokAdsServiceDeps = {
  db?: Pick<DbClient, "query">;
  fetchFn?: typeof fetch;
};

function toNum(v: unknown): number {
  if (v === undefined || v === null) return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const n = Number.parseFloat(String(v));
  return Number.isFinite(n) ? n : 0;
}

function formatYmdUTC(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function last30DayRange(): { startDate: string; endDate: string } {
  const end = new Date();
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 29);
  return { startDate: formatYmdUTC(start), endDate: formatYmdUTC(end) };
}

function normalizeAdvertiserId(id: string): string {
  return id.trim();
}

type TikTokEnvelope<T = unknown> = {
  code?: number;
  message?: string;
  data?: T;
};

function ensureOk(body: TikTokEnvelope): void {
  const code = body.code;
  if (code !== undefined && code !== 0) {
    throw new OsAgentError(`TikTok API error (code ${code}): ${String(body.message ?? "").slice(0, 400)}`, "tiktok_api");
  }
}

export class TikTokAdsService {
  constructor(private readonly deps: TikTokAdsServiceDeps = {}) {}

  private get db(): Pick<DbClient, "query"> {
    return this.deps.db ?? DbClientClass.getInstance();
  }

  private get fetchImpl(): typeof fetch {
    return this.deps.fetchFn ?? globalThis.fetch.bind(globalThis);
  }

  private headers(accessToken: string): Record<string, string> {
    return {
      "Access-Token": accessToken,
      "Content-Type": "application/json",
    };
  }

  private async tikTokGetAuthed(pathWithLeadingSlash: string, accessToken: string, searchParams: URLSearchParams): Promise<unknown> {
    const url = `${BASE}${pathWithLeadingSlash}?${searchParams.toString()}`;
    const res = await this.fetchImpl(url, { method: "GET", headers: this.headers(accessToken) });
    const text = await res.text();
    let body: TikTokEnvelope;
    try {
      body = JSON.parse(text) as TikTokEnvelope;
    } catch {
      throw new OsAgentError(`TikTok Ads returned non-JSON (HTTP ${res.status})`, "tiktok_http");
    }
    if (!res.ok) {
      throw new OsAgentError(`TikTok Ads HTTP ${res.status}: ${text.slice(0, 400)}`, "tiktok_http");
    }
    ensureOk(body);
    return body;
  }

  async saveCredentials(userId: string, advertiserId: string, accessToken: string): Promise<void> {
    const aid = normalizeAdvertiserId(advertiserId);
    const tok = accessToken.trim();
    if (!aid || !tok) {
      throw new OsAgentError("advertiserId y accessToken son requeridos.", "tiktok_validation");
    }
    await this.db.query(
      `INSERT INTO integration_tiktok_ads
         (user_id, advertiser_id, access_token, is_active, updated_at)
       VALUES ($1::uuid, $2, $3, true, NOW())
       ON CONFLICT (user_id)
       DO UPDATE SET
         advertiser_id = EXCLUDED.advertiser_id,
         access_token = EXCLUDED.access_token,
         is_active = true,
         updated_at = NOW()`,
      [userId, aid, tok],
    );
  }

  async getCredentials(userId: string): Promise<TikTokAdsCredentials | null> {
    const rows = await this.db.query<{
      user_id: string;
      advertiser_id: string | null;
      access_token: string | null;
      is_active: boolean;
    }>(
      `SELECT user_id::text, advertiser_id, access_token, is_active
       FROM integration_tiktok_ads
       WHERE user_id = $1::uuid AND is_active = true
       LIMIT 1`,
      [userId],
    );
    const r = rows[0];
    if (!r || !r.access_token || !r.advertiser_id) return null;
    return {
      userId: r.user_id,
      advertiserId: r.advertiser_id,
      accessToken: r.access_token,
      isActive: r.is_active,
    };
  }

  private async requireCredentials(userId: string): Promise<TikTokAdsCredentials> {
    const c = await this.getCredentials(userId);
    if (!c) {
      throw new OsAgentError("TikTok Ads is not connected for this user.", "tiktok_auth");
    }
    return c;
  }

  private budgetFromCampaign(row: Record<string, unknown>): number {
    const b = row.budget;
    if (typeof b === "number") return toNum(b);
    if (typeof b === "object" && b !== null && "budget" in b) return toNum((b as { budget?: unknown }).budget);
    const bm = row.budget_mode;
    if (typeof bm === "object" && bm !== null && "budget" in bm) return toNum((bm as { budget?: unknown }).budget);
    const lifetime = toNum(row["lifetime_budget"]);
    if (lifetime > 0) return lifetime;
    return toNum(row["daily_budget"]);
  }

  async getCampaigns(userId: string): Promise<TikTokCampaign[]> {
    const c = await this.requireCredentials(userId);
    const params = new URLSearchParams();
    params.set("advertiser_id", c.advertiserId);
    params.set("page_size", "1000");
    const raw = (await this.tikTokGetAuthed("/campaign/get/", c.accessToken, params)) as TikTokEnvelope<{
      list?: ReadonlyArray<Record<string, unknown>>;
    }>;
    const list = raw.data?.list ?? [];
    return list.map((row) => {
      const id = String(row.campaign_id ?? row["campaignId"] ?? "");
      const name = String(row.campaign_name ?? row["campaignName"] ?? "");
      const status = String(row.operation_status ?? row.status ?? "");
      const objective = String(row.objective_type ?? row.objective ?? "");
      const budget = this.budgetFromCampaign(row);
      return {
        campaignId: id,
        campaignName: name,
        status,
        budget,
        objective,
      };
    });
  }

  private integratedReportParams(
    advertiserId: string,
    dateRange: { startDate: string; endDate: string },
    opts: {
      dataLevel: string;
      dimensions: string[];
      metrics: string[];
      filtering?: ReadonlyArray<Record<string, unknown>>;
      enableTotalMetrics?: boolean;
    },
  ): URLSearchParams {
    const params = new URLSearchParams();
    params.set("advertiser_id", advertiserId);
    params.set("report_type", "BASIC");
    params.set("data_level", opts.dataLevel);
    params.set("dimensions", JSON.stringify(opts.dimensions));
    params.set("metrics", JSON.stringify(opts.metrics));
    params.set("start_date", dateRange.startDate.replace(/[^0-9-]/g, ""));
    params.set("end_date", dateRange.endDate.replace(/[^0-9-]/g, ""));
    if (opts.enableTotalMetrics) params.set("enable_total_metrics", "true");
    if (opts.filtering && opts.filtering.length > 0) {
      params.set("filtering", JSON.stringify(opts.filtering));
    }
    return params;
  }

  private sumTotalsFromRows(list: ReadonlyArray<Record<string, unknown>>): {
    impressions: number;
    clicks: number;
    spend: number;
    conversions: number;
  } {
    let impressions = 0;
    let clicks = 0;
    let spend = 0;
    let conversions = 0;
    for (const row of list) {
      impressions += Math.round(toNum(row.impressions ?? row["stat_impressions"]));
      clicks += Math.round(toNum(row.clicks ?? row["stat_clicks"]));
      spend += toNum(row.spend ?? row.cost ?? row["stat_cost"]);
      conversions += Math.round(toNum(row.conversion ?? row.conversions ?? row["conversion_cnt"]));
    }
    return { impressions, clicks, spend, conversions };
  }

  async getCampaignMetrics(
    userId: string,
    campaignId: string,
    dateRange: { startDate: string; endDate: string },
  ): Promise<TikTokCampaignMetrics> {
    const c = await this.requireCredentials(userId);
    const cid = campaignId.trim();
    const metrics = ["impressions", "clicks", "spend", "conversion", "ctr", "cpc"];
    const params = this.integratedReportParams(c.advertiserId, dateRange, {
      dataLevel: "AUCTION_CAMPAIGN",
      dimensions: ["campaign_id"],
      metrics,
    });
    params.set("page_size", "1000");
    const raw = (await this.tikTokGetAuthed("/report/integrated/get/", c.accessToken, params)) as TikTokEnvelope<{
      list?: ReadonlyArray<Record<string, unknown>>;
    }>;
    const list = raw.data?.list ?? [];
    const match =
      list.find((r) => String(r.campaign_id ?? r["campaign_id"] ?? "") === cid) ??
      list.find((r) => String(r.campaign_id ?? r["campaign_id"] ?? "") === String(Number(cid))) ??
      {};
    const impressions = Math.round(toNum(match.impressions));
    const clicks = Math.round(toNum(match.clicks));
    const spend = toNum(match.spend);
    const conversions = Math.round(toNum(match.conversion ?? match.conversions));
    const ctr = impressions > 0 ? clicks / impressions : toNum(match.ctr);
    const cpc = clicks > 0 ? spend / clicks : toNum(match.cpc);
    return {
      campaignId: cid,
      impressions,
      clicks,
      spend,
      conversions,
      ctr,
      cpc,
    };
  }

  async getAccountSummary(userId: string): Promise<TikTokAccountSummary> {
    const c = await this.requireCredentials(userId);
    const range = last30DayRange();
    const metrics = ["impressions", "clicks", "spend", "conversion"];
    const params = this.integratedReportParams(c.advertiserId, range, {
      dataLevel: "AUCTION_ADVERTISER",
      dimensions: ["stat_time_day"],
      metrics,
    });
    params.set("page_size", "1000");
    const raw = (await this.tikTokGetAuthed("/report/integrated/get/", c.accessToken, params)) as TikTokEnvelope<{
      list?: ReadonlyArray<Record<string, unknown>>;
    }>;
    const list = raw.data?.list ?? [];
    const agg = this.sumTotalsFromRows(list);
    return {
      totalSpend: agg.spend,
      impressions: agg.impressions,
      clicks: agg.clicks,
      conversions: agg.conversions,
    };
  }

  private parseAudienceInsightsPayload(data: unknown): TikTokAudienceInsights {
    const empty = (): TikTokAudienceInsights => ({
      ageBreakdown: [],
      genderBreakdown: [],
      countryBreakdown: [],
    });
    if (typeof data !== "object" || data === null) return empty();
    const d = data as Record<string, unknown>;

    const parseSlice = (
      key: string,
    ): ReadonlyArray<{ ageRange?: string; gender?: string; country?: string; percentage?: number; count?: number }> => {
      const raw = d[key];
      if (!Array.isArray(raw)) return [];
      return raw.map((item) => {
        if (typeof item !== "object" || item === null) return {};
        const o = item as Record<string, unknown>;
        return {
          ageRange: String(o.age_range ?? o.age ?? ""),
          gender: String(o.gender ?? ""),
          country: String(o.country_code ?? o.country ?? ""),
          percentage: toNum(o.percentage ?? o.ratio),
          count: Math.round(toNum(o.count ?? o.value)),
        };
      });
    };

    const ages = parseSlice("age_breakdown").map((x) => ({
      ageRange: String(x.ageRange ?? ""),
      percentage: x.percentage,
      count: x.count,
    }));
    const genders = parseSlice("gender_breakdown").map((x) => ({
      gender: String(x.gender ?? ""),
      percentage: x.percentage,
      count: x.count,
    }));
    const countries = parseSlice("country_breakdown").map((x) => ({
      country: String(x.country ?? ""),
      percentage: x.percentage,
      count: x.count,
    }));

    if (ages.length || genders.length || countries.length) {
      return { ageBreakdown: ages, genderBreakdown: genders, countryBreakdown: countries };
    }

    const insight = (d.insight ?? d.insights ?? d.breakdown) as Record<string, unknown> | undefined;
    if (insight && typeof insight === "object") {
      return this.parseAudienceInsightsPayload(insight);
    }

    return empty();
  }

  async getAudienceInsights(userId: string): Promise<TikTokAudienceInsights> {
    const c = await this.requireCredentials(userId);
    const params = new URLSearchParams();
    params.set("advertiser_id", c.advertiserId);
    const raw = (await this.tikTokGetAuthed("/audience/insights/", c.accessToken, params)) as TikTokEnvelope;
    return this.parseAudienceInsightsPayload(raw.data);
  }

  async revokeAccess(userId: string): Promise<void> {
    await this.db.query(`UPDATE integration_tiktok_ads SET is_active = false, updated_at = NOW() WHERE user_id = $1::uuid`, [
      userId,
    ]);
  }
}

let cachedTikTokAds: TikTokAdsService | undefined;

export function getTikTokAdsService(): TikTokAdsService {
  if (!cachedTikTokAds) cachedTikTokAds = new TikTokAdsService();
  return cachedTikTokAds;
}

export function resetTikTokAdsServiceForTests(): void {
  cachedTikTokAds = undefined;
}
