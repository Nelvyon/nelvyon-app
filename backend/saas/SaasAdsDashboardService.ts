/**
 * SaasAdsDashboardService — fetch real ad metrics from Meta Ads & Google Ads.
 * Tenant-scoped (saas_ads_connections). Caches results in saas_ads_metrics_cache.
 * If no connection → { connected: false }. Never returns fake data.
 */
import { DbClient } from "../db/DbClient";
import { resolveAdsConnectionToken } from "./saasAdsTokenRefresh";

export type AdsPlatform = "meta" | "google" | "linkedin" | "tiktok" | "snapchat";

export type AdsConnection = {
  id: string;
  tenantId: string;
  platform: AdsPlatform;
  accountId: string;
  accountName: string;
  tokenExpiresAt: string | null;
  isActive: boolean;
  createdAt: string;
};

export type AdsMetrics = {
  platform: AdsPlatform;
  dateStart: string;
  dateEnd: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number | null;
  cpc: number | null;
  roas: number | null;
  fromCache: boolean;
  fetchedAt: string;
};

export type AdsConnectionInput = {
  platform: AdsPlatform;
  accountId: string;
  accountName: string;
  accessToken: string;
  refreshToken?: string;
  tokenExpiresAt?: string;
  extraConfig?: Record<string, unknown>;
};

export type AdsCampaignStatus = "ACTIVE" | "PAUSED" | "DELETED" | "ARCHIVED" | "UNKNOWN";

export type AdsCampaign = {
  id: string;
  name: string;
  status: AdsCampaignStatus;
  platform: AdsPlatform;
  dailyBudget: number | null;
};

export type RoasAlert = {
  platform: AdsPlatform;
  roas: number;
  threshold: number;
  dateStart: string;
  dateEnd: string;
  spend: number;
  fetchedAt: string;
};

export type AdsStatusResult = {
  platform: AdsPlatform;
  connected: boolean;
  accountName?: string;
  tokenExpired?: boolean;
};

export type AdsCreateCampaignInput = {
  platform: AdsPlatform;
  name: string;
  objective?: string;
  dailyBudgetUsd: number;
  status?: "ACTIVE" | "PAUSED";
};

export type AdsAttributionModel = "first_touch" | "last_touch" | "linear" | "time_decay";

export type AdsCampaignLinkInput = {
  platform: AdsPlatform;
  externalCampaignId: string;
  externalCampaignName?: string;
  utmCampaign: string;
  utmSource?: string;
  utmMedium?: string;
};

export type AdsCampaignLink = {
  id: string;
  tenantId: string;
  platform: AdsPlatform;
  externalCampaignId: string;
  externalCampaignName: string | null;
  utmCampaign: string;
  utmSource: string | null;
  utmMedium: string | null;
  createdAt: string;
};

export type AttributedRoasRow = {
  link: AdsCampaignLink;
  spend: number;
  attributedCredit: number;
  attributedConversions: number;
  attributedRoas: number | null;
  model: AdsAttributionModel;
};

export class SaasAdsDashboardError extends Error {
  constructor(message: string, public readonly code: "NOT_FOUND" | "NOT_CONNECTED" | "VALIDATION" | "API_ERROR") {
    super(message);
    this.name = "SaasAdsDashboardError";
  }
}

const PLATFORMS: AdsPlatform[] = ["meta", "google", "linkedin", "tiktok", "snapchat"];
const CACHE_TTL_HOURS = 4;

type DbPort = { query: <T = Record<string, unknown>>(sql: string, params?: unknown[]) => Promise<T[]> };
type FetchFn = typeof fetch;

type ConnectionRow = {
  id: string; tenant_id: string; platform: string; account_id: string; account_name: string;
  access_token: string; refresh_token: string | null; token_expires_at: string | null;
  extra_config: Record<string, unknown>; is_active: boolean; created_at: Date;
};
type CacheRow = {
  id: string; connection_id: string; tenant_id: string; date_start: string; date_end: string;
  spend: string; impressions: string; clicks: string; conversions: string;
  ctr: string | null; cpc: string | null; roas: string | null; fetched_at: Date;
};

type LinkRow = {
  id: string; tenant_id: string; platform: string;
  external_campaign_id: string; external_campaign_name: string | null;
  utm_campaign: string; utm_source: string | null; utm_medium: string | null;
  created_at: Date;
};

function rowToLink(r: LinkRow): AdsCampaignLink {
  return {
    id: r.id, tenantId: r.tenant_id, platform: r.platform as AdsPlatform,
    externalCampaignId: r.external_campaign_id, externalCampaignName: r.external_campaign_name,
    utmCampaign: r.utm_campaign, utmSource: r.utm_source, utmMedium: r.utm_medium,
    createdAt: new Date(r.created_at).toISOString(),
  };
}

function rowToConnection(r: ConnectionRow): AdsConnection {
  return {
    id: r.id, tenantId: r.tenant_id, platform: r.platform as AdsPlatform,
    accountId: r.account_id, accountName: r.account_name,
    tokenExpiresAt: r.token_expires_at, isActive: r.is_active,
    createdAt: new Date(r.created_at).toISOString(),
  };
}

export class SaasAdsDashboardService {
  constructor(private readonly db: DbPort, private readonly fetchFn: FetchFn = fetch) {}

  private async _getLiveConnection(tenantId: string, platform: AdsPlatform): Promise<ConnectionRow> {
    const conn = await resolveAdsConnectionToken(tenantId, platform, this.db);
    if (!conn) throw new SaasAdsDashboardError(`No active ${platform} connection`, "NOT_CONNECTED");
    return conn;
  }

  async listConnections(tenantId: string): Promise<AdsConnection[]> {
    const rows = await this.db.query<ConnectionRow>(
      `SELECT id,tenant_id,platform,account_id,account_name,token_expires_at,is_active,extra_config,access_token,refresh_token,created_at
       FROM saas_ads_connections WHERE tenant_id=$1 ORDER BY platform,created_at DESC`,
      [tenantId],
    );
    return rows.map(rowToConnection);
  }

  async getStatus(tenantId: string): Promise<AdsStatusResult[]> {
    const conns = await this.listConnections(tenantId);
    return PLATFORMS.map((p) => {
      const c = conns.find((x) => x.platform === p && x.isActive);
      if (!c) return { platform: p, connected: false };
      const expired = c.tokenExpiresAt ? new Date(c.tokenExpiresAt) < new Date() : false;
      return { platform: p, connected: true, accountName: c.accountName, tokenExpired: expired };
    });
  }

  async connectAccount(tenantId: string, input: AdsConnectionInput): Promise<AdsConnection> {
    if (!PLATFORMS.includes(input.platform)) throw new SaasAdsDashboardError(`platform must be one of: ${PLATFORMS.join(", ")}`, "VALIDATION");
    if (!input.accountId?.trim()) throw new SaasAdsDashboardError("accountId required", "VALIDATION");
    if (!input.accountName?.trim()) throw new SaasAdsDashboardError("accountName required", "VALIDATION");
    if (!input.accessToken?.trim()) throw new SaasAdsDashboardError("accessToken required", "VALIDATION");

    const rows = await this.db.query<ConnectionRow>(
      `INSERT INTO saas_ads_connections (tenant_id,platform,account_id,account_name,access_token,refresh_token,token_expires_at,extra_config)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb)
       ON CONFLICT (tenant_id,platform,account_id) DO UPDATE SET
         account_name=EXCLUDED.account_name, access_token=EXCLUDED.access_token,
         refresh_token=EXCLUDED.refresh_token, token_expires_at=EXCLUDED.token_expires_at,
         extra_config=EXCLUDED.extra_config, is_active=true, updated_at=NOW()
       RETURNING id,tenant_id,platform,account_id,account_name,access_token,refresh_token,token_expires_at,extra_config,is_active,created_at`,
      [tenantId, input.platform, input.accountId, input.accountName, input.accessToken,
       input.refreshToken ?? null, input.tokenExpiresAt ?? null,
       JSON.stringify(input.extraConfig ?? {})],
    );
    return rowToConnection(rows[0]);
  }

  async disconnectAccount(tenantId: string, connectionId: string): Promise<void> {
    const rows = await this.db.query<{ id: string }>(
      `UPDATE saas_ads_connections SET is_active=false, updated_at=NOW() WHERE id=$1 AND tenant_id=$2 RETURNING id`,
      [connectionId, tenantId],
    );
    if (!rows.length) throw new SaasAdsDashboardError("Connection not found", "NOT_FOUND");
  }

  async getMetrics(tenantId: string, platform: AdsPlatform, dateStart: string, dateEnd: string): Promise<AdsMetrics> {
    const conn = await this._getLiveConnection(tenantId, platform);

    // Check cache
    const cacheThreshold = new Date(Date.now() - CACHE_TTL_HOURS * 3600 * 1000).toISOString();
    const cached = await this.db.query<CacheRow>(
      `SELECT * FROM saas_ads_metrics_cache WHERE connection_id=$1 AND date_start=$2 AND date_end=$3 AND fetched_at > $4 LIMIT 1`,
      [conn.id, dateStart, dateEnd, cacheThreshold],
    );
    if (cached.length) {
      const c = cached[0];
      return {
        platform, dateStart, dateEnd, fromCache: true,
        spend: Number(c.spend), impressions: Number(c.impressions),
        clicks: Number(c.clicks), conversions: Number(c.conversions),
        ctr: c.ctr !== null ? Number(c.ctr) : null,
        cpc: c.cpc !== null ? Number(c.cpc) : null,
        roas: c.roas !== null ? Number(c.roas) : null,
        fetchedAt: new Date(c.fetched_at).toISOString(),
      };
    }

    // Fetch live
    let metrics: Omit<AdsMetrics, "platform" | "dateStart" | "dateEnd" | "fromCache" | "fetchedAt">;
    if (platform === "meta") {
      metrics = await this._fetchMetaMetrics(conn.access_token, conn.account_id, conn.extra_config, dateStart, dateEnd);
    } else if (platform === "google") {
      metrics = await this._fetchGoogleMetrics(conn.access_token, conn.account_id, conn.extra_config, dateStart, dateEnd);
    } else if (platform === "tiktok") {
      metrics = await this._fetchTikTokMetrics(conn.access_token, conn.account_id, dateStart, dateEnd);
    } else if (platform === "linkedin") {
      metrics = await this._fetchLinkedInMetrics(conn.access_token, conn.account_id, dateStart, dateEnd);
    } else if (platform === "snapchat") {
      metrics = await this._fetchSnapchatMetrics(conn.access_token, conn.account_id, dateStart, dateEnd);
    } else {
      throw new SaasAdsDashboardError(`Live metrics for ${platform} not yet implemented. Connect Meta or Google.`, "API_ERROR");
    }

    const now = new Date().toISOString();
    // Upsert cache
    await this.db.query(
      `INSERT INTO saas_ads_metrics_cache (connection_id,tenant_id,date_start,date_end,spend,impressions,clicks,conversions,ctr,cpc,roas,fetched_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW())
       ON CONFLICT (connection_id,date_start,date_end) DO UPDATE SET
         spend=$5,impressions=$6,clicks=$7,conversions=$8,ctr=$9,cpc=$10,roas=$11,fetched_at=NOW()`,
      [conn.id, tenantId, dateStart, dateEnd, metrics.spend, metrics.impressions,
       metrics.clicks, metrics.conversions, metrics.ctr, metrics.cpc, metrics.roas],
    ).catch(() => null);

    return { platform, dateStart, dateEnd, fromCache: false, fetchedAt: now, ...metrics };
  }

  private async _fetchMetaMetrics(
    token: string, accountId: string, extra: Record<string, unknown>,
    dateStart: string, dateEnd: string,
  ): Promise<Omit<AdsMetrics, "platform" | "dateStart" | "dateEnd" | "fromCache" | "fetchedAt">> {
    const fields = "spend,impressions,clicks,actions,action_values,ctr,cpc";
    const url = `https://graph.facebook.com/v19.0/act_${accountId}/insights?fields=${fields}&time_range={"since":"${dateStart}","until":"${dateEnd}"}&access_token=${token}`;
    const res = await this.fetchFn(url);
    const data = await res.json() as { data?: Array<Record<string, string>>; error?: { message: string } };
    if (!res.ok || data.error) {
      throw new SaasAdsDashboardError(`Meta Ads API: ${data.error?.message ?? "unknown error"}`, "API_ERROR");
    }
    const row = data.data?.[0] ?? {};
    const conversions = (row["actions"] as unknown as Array<{ action_type: string; value: string }> ?? [])
      .filter((a) => a.action_type === "purchase" || a.action_type === "lead")
      .reduce((sum, a) => sum + Number(a.value), 0);
    const revenue = (row["action_values"] as unknown as Array<{ action_type: string; value: string }> ?? [])
      .filter((a) => a.action_type === "purchase")
      .reduce((sum, a) => sum + Number(a.value), 0);
    const spend = Number(row["spend"] ?? 0);
    return {
      spend, impressions: Number(row["impressions"] ?? 0), clicks: Number(row["clicks"] ?? 0),
      conversions, ctr: row["ctr"] ? Number(row["ctr"]) : null,
      cpc: row["cpc"] ? Number(row["cpc"]) : null,
      roas: spend > 0 && revenue > 0 ? revenue / spend : null,
    };
  }

  private async _fetchGoogleMetrics(
    token: string, customerId: string, extra: Record<string, unknown>,
    dateStart: string, dateEnd: string,
  ): Promise<Omit<AdsMetrics, "platform" | "dateStart" | "dateEnd" | "fromCache" | "fetchedAt">> {
    const cleanCustomerId = customerId.replace(/-/g, "");
    const query = `SELECT metrics.cost_micros,metrics.impressions,metrics.clicks,metrics.conversions,metrics.ctr,metrics.average_cpc,metrics.conversions_value FROM customer WHERE segments.date BETWEEN '${dateStart}' AND '${dateEnd}'`;
    const res = await this.fetchFn(
      `https://googleads.googleapis.com/v14/customers/${cleanCustomerId}/googleAds:search`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "developer-token": String(extra["developerToken"] ?? ""),
        },
        body: JSON.stringify({ query }),
      },
    );
    const data = await res.json() as { results?: Array<{ metrics: Record<string, number> }>; error?: { message: string } };
    if (!res.ok || data.error) {
      throw new SaasAdsDashboardError(`Google Ads API: ${data.error?.message ?? "unknown error"}`, "API_ERROR");
    }
    const totals = (data.results ?? []).reduce(
      (acc, r) => {
        const m = r.metrics;
        acc.costMicros += m["cost_micros"] ?? 0;
        acc.impressions += m["impressions"] ?? 0;
        acc.clicks += m["clicks"] ?? 0;
        acc.conversions += m["conversions"] ?? 0;
        acc.revenue += m["conversions_value"] ?? 0;
        return acc;
      },
      { costMicros: 0, impressions: 0, clicks: 0, conversions: 0, revenue: 0 },
    );
    const spend = totals.costMicros / 1_000_000;
    const ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : null;
    const cpc = totals.clicks > 0 ? spend / totals.clicks : null;
    const roas = spend > 0 && totals.revenue > 0 ? totals.revenue / spend : null;
    return { spend, impressions: totals.impressions, clicks: totals.clicks, conversions: totals.conversions, ctr, cpc, roas };
  }

  // ─── Campaign management ──────────────────────────────────────────────────

  async listCampaigns(tenantId: string, platform: AdsPlatform): Promise<AdsCampaign[]> {
    const conn = await this._getLiveConnection(tenantId, platform);
    if (platform === "meta") return this._fetchMetaCampaigns(conn.access_token, conn.account_id);
    if (platform === "google") return this._fetchGoogleCampaigns(conn.access_token, conn.account_id, conn.extra_config);
    if (platform === "tiktok") return this._fetchTikTokCampaigns(conn.access_token, conn.account_id);
    if (platform === "snapchat") return this._fetchSnapchatCampaigns(conn.access_token, conn.account_id);
    if (platform === "linkedin") return this._fetchLinkedInCampaigns(conn.access_token, conn.account_id);
    throw new SaasAdsDashboardError(`Campaign listing for ${platform} not yet implemented`, "API_ERROR");
  }

  async createCampaign(tenantId: string, input: AdsCreateCampaignInput): Promise<AdsCampaign> {
    const conn = await this._getLiveConnection(tenantId, input.platform);
    if (input.platform === "meta") return this._createMetaCampaign(conn.access_token, conn.account_id, input);
    if (input.platform === "google") return this._createGoogleCampaign(conn.access_token, conn.account_id, conn.extra_config, input);
    if (input.platform === "tiktok") return this._createTikTokCampaign(conn.access_token, conn.account_id, input);
    if (input.platform === "snapchat") return this._createSnapchatCampaign(conn.access_token, conn.account_id, input);
    if (input.platform === "linkedin") return this._createLinkedInCampaign(conn.access_token, conn.account_id, conn.extra_config, input);
    throw new SaasAdsDashboardError(`Campaign creation for ${input.platform} not yet implemented`, "API_ERROR");
  }

  async updateCampaignBudget(tenantId: string, platform: AdsPlatform, campaignId: string, dailyBudgetUsd: number): Promise<AdsCampaign> {
    if (dailyBudgetUsd <= 0) throw new SaasAdsDashboardError("dailyBudgetUsd must be > 0", "VALIDATION");
    const conn = await this._getLiveConnection(tenantId, platform);
    if (platform === "meta") return this._updateMetaBudget(conn.access_token, campaignId, dailyBudgetUsd);
    if (platform === "google") return this._updateGoogleBudget(conn.access_token, conn.account_id, conn.extra_config, campaignId, dailyBudgetUsd);
    if (platform === "tiktok") return this._updateTikTokBudget(conn.access_token, conn.account_id, campaignId, dailyBudgetUsd);
    if (platform === "snapchat") return this._updateSnapchatBudget(conn.access_token, campaignId, dailyBudgetUsd);
    if (platform === "linkedin") return this._updateLinkedInBudget(conn.access_token, campaignId, dailyBudgetUsd);
    throw new SaasAdsDashboardError(`Budget update for ${platform} not yet implemented`, "API_ERROR");
  }

  async setCampaignStatus(tenantId: string, platform: AdsPlatform, campaignId: string, status: "ACTIVE" | "PAUSED"): Promise<void> {
    const conn = await this._getLiveConnection(tenantId, platform);
    if (platform === "meta") return this._setMetaCampaignStatus(conn.access_token, campaignId, status);
    if (platform === "google") return this._setGoogleCampaignStatus(conn.access_token, conn.account_id, conn.extra_config, campaignId, status);
    if (platform === "tiktok") return this._setTikTokCampaignStatus(conn.access_token, conn.account_id, campaignId, status);
    if (platform === "snapchat") return this._setSnapchatCampaignStatus(conn.access_token, campaignId, status);
    if (platform === "linkedin") return this._setLinkedInCampaignStatus(conn.access_token, campaignId, status);
    throw new SaasAdsDashboardError(`Campaign management for ${platform} not yet implemented`, "API_ERROR");
  }

  async getRoasAlerts(tenantId: string, roasThreshold = 1.5): Promise<RoasAlert[]> {
    const dateEnd = new Date().toISOString().slice(0, 10);
    const dateStart = new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10);
    const cached = await this.db.query<CacheRow & { platform: string }>(
      `SELECT c.*, a.platform FROM saas_ads_metrics_cache c
       JOIN saas_ads_connections a ON a.id = c.connection_id
       WHERE a.tenant_id=$1 AND c.date_start=$2 AND c.date_end=$3`,
      [tenantId, dateStart, dateEnd],
    );
    return cached
      .filter((r) => r.roas !== null && Number(r.roas) < roasThreshold)
      .map((r) => ({
        platform: r.platform as AdsPlatform,
        roas: Number(r.roas),
        threshold: roasThreshold,
        dateStart,
        dateEnd,
        spend: Number(r.spend),
        fetchedAt: new Date(r.fetched_at).toISOString(),
      }));
  }

  private async _fetchMetaCampaigns(token: string, accountId: string): Promise<AdsCampaign[]> {
    const fields = "id,name,status,effective_status,daily_budget,lifetime_budget";
    const res = await this.fetchFn(
      `https://graph.facebook.com/v19.0/act_${accountId}/campaigns?fields=${fields}&access_token=${token}`,
    );
    const data = await res.json() as { data?: Array<Record<string, string>>; error?: { message: string } };
    if (!res.ok || data.error) throw new SaasAdsDashboardError(`Meta Ads: ${data.error?.message ?? "unknown error"}`, "API_ERROR");
    return (data.data ?? []).map((c) => ({
      id: c["id"] ?? "", name: c["name"] ?? "",
      status: (c["effective_status"] ?? c["status"] ?? "UNKNOWN") as AdsCampaignStatus,
      platform: "meta" as AdsPlatform,
      dailyBudget: c["daily_budget"] ? Number(c["daily_budget"]) / 100 : null,
    }));
  }

  private async _fetchGoogleCampaigns(token: string, customerId: string, extra: Record<string, unknown>): Promise<AdsCampaign[]> {
    const cleanId = customerId.replace(/-/g, "");
    const query = "SELECT campaign.id,campaign.name,campaign.status,campaign_budget.amount_micros FROM campaign ORDER BY campaign.name";
    const res = await this.fetchFn(
      `https://googleads.googleapis.com/v14/customers/${cleanId}/googleAds:search`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "developer-token": String(extra["developerToken"] ?? ""),
        },
        body: JSON.stringify({ query }),
      },
    );
    const data = await res.json() as { results?: Array<{ campaign: Record<string, unknown>; campaignBudget?: Record<string, number> }>; error?: { message: string } };
    if (!res.ok || data.error) throw new SaasAdsDashboardError(`Google Ads: ${data.error?.message ?? "unknown error"}`, "API_ERROR");
    return (data.results ?? []).map((r) => ({
      id: String(r.campaign["id"] ?? ""),
      name: String(r.campaign["name"] ?? ""),
      status: String(r.campaign["status"] ?? "UNKNOWN") as AdsCampaignStatus,
      platform: "google" as AdsPlatform,
      dailyBudget: r.campaignBudget ? Number(r.campaignBudget["amountMicros"] ?? 0) / 1_000_000 : null,
    }));
  }

  private async _setMetaCampaignStatus(token: string, campaignId: string, status: "ACTIVE" | "PAUSED"): Promise<void> {
    const metaStatus = status === "ACTIVE" ? "ACTIVE" : "PAUSED";
    const res = await this.fetchFn(
      `https://graph.facebook.com/v19.0/${campaignId}`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: metaStatus, access_token: token }) },
    );
    const data = await res.json() as { success?: boolean; error?: { message: string } };
    if (!res.ok || data.error) throw new SaasAdsDashboardError(`Meta Ads: ${data.error?.message ?? "unknown error"}`, "API_ERROR");
  }

  private async _setGoogleCampaignStatus(token: string, customerId: string, extra: Record<string, unknown>, campaignId: string, status: "ACTIVE" | "PAUSED"): Promise<void> {
    const cleanId = customerId.replace(/-/g, "");
    const googleStatus = status === "ACTIVE" ? "ENABLED" : "PAUSED";
    const res = await this.fetchFn(
      `https://googleads.googleapis.com/v14/customers/${cleanId}/campaigns:mutate`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "developer-token": String(extra["developerToken"] ?? ""),
        },
        body: JSON.stringify({ operations: [{ update: { resourceName: `customers/${cleanId}/campaigns/${campaignId}`, status: googleStatus }, updateMask: "status" }] }),
      },
    );
    const data = await res.json() as { error?: { message: string } };
    if (!res.ok || data.error) throw new SaasAdsDashboardError(`Google Ads: ${data.error?.message ?? "unknown error"}`, "API_ERROR");
  }

  // ── Create campaign ─────────────────────────────────────────────────────────

  private async _createMetaCampaign(token: string, accountId: string, input: AdsCreateCampaignInput): Promise<AdsCampaign> {
    const budgetCents = Math.round(input.dailyBudgetUsd * 100);
    const res = await this.fetchFn(
      `https://graph.facebook.com/v19.0/act_${accountId}/campaigns`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: input.name,
          objective: input.objective ?? "LINK_CLICKS",
          status: input.status ?? "PAUSED",
          daily_budget: budgetCents,
          access_token: token,
        }),
      },
    );
    const data = await res.json() as { id?: string; error?: { message: string } };
    if (!res.ok || data.error) throw new SaasAdsDashboardError(`Meta Ads: ${data.error?.message ?? "unknown error"}`, "API_ERROR");
    return { id: data.id ?? "", name: input.name, status: input.status ?? "PAUSED", platform: "meta", dailyBudget: input.dailyBudgetUsd };
  }

  private async _createGoogleCampaign(token: string, customerId: string, extra: Record<string, unknown>, input: AdsCreateCampaignInput): Promise<AdsCampaign> {
    const cleanId = customerId.replace(/-/g, "");
    const budgetMicros = Math.round(input.dailyBudgetUsd * 1_000_000);
    const res = await this.fetchFn(
      `https://googleads.googleapis.com/v14/customers/${cleanId}/campaigns:mutate`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "developer-token": String(extra["developerToken"] ?? ""),
        },
        body: JSON.stringify({
          operations: [{
            create: {
              name: input.name,
              status: input.status === "ACTIVE" ? "ENABLED" : "PAUSED",
              advertisingChannelType: "SEARCH",
              campaignBudget: { amountMicros: budgetMicros, deliveryMethod: "STANDARD" },
            },
          }],
        }),
      },
    );
    const data = await res.json() as { results?: Array<{ resourceName?: string }>; error?: { message: string } };
    if (!res.ok || data.error) throw new SaasAdsDashboardError(`Google Ads: ${data.error?.message ?? "unknown error"}`, "API_ERROR");
    const resourceName = data.results?.[0]?.resourceName ?? "";
    const id = resourceName.split("/").pop() ?? resourceName;
    return { id, name: input.name, status: input.status ?? "PAUSED", platform: "google", dailyBudget: input.dailyBudgetUsd };
  }

  // ── TikTok API ──────────────────────────────────────────────────────────────
  // Docs: https://business-api.tiktok.com/portal/docs

  private async _fetchTikTokCampaigns(token: string, advertiserId: string): Promise<AdsCampaign[]> {
    const res = await this.fetchFn(
      `https://business-api.tiktok.com/open_api/v1.3/campaign/get/?advertiser_id=${advertiserId}&fields=["campaign_id","campaign_name","operation_status","budget"]`,
      { headers: { "Access-Token": token, "Content-Type": "application/json" } },
    );
    const data = await res.json() as { code?: number; message?: string; data?: { list?: Array<Record<string, unknown>> } };
    if (!res.ok || (data.code !== undefined && data.code !== 0)) {
      throw new SaasAdsDashboardError(`TikTok Ads: ${data.message ?? "unknown error"}`, "API_ERROR");
    }
    return (data.data?.list ?? []).map((c) => ({
      id: String(c["campaign_id"] ?? ""),
      name: String(c["campaign_name"] ?? ""),
      status: (c["operation_status"] === "ENABLE" ? "ACTIVE" : "PAUSED") as AdsCampaignStatus,
      platform: "tiktok" as AdsPlatform,
      dailyBudget: c["budget"] ? Number(c["budget"]) : null,
    }));
  }

  private async _setTikTokCampaignStatus(token: string, advertiserId: string, campaignId: string, status: "ACTIVE" | "PAUSED"): Promise<void> {
    const operationStatus = status === "ACTIVE" ? "ENABLE" : "DISABLE";
    const res = await this.fetchFn(
      "https://business-api.tiktok.com/open_api/v1.3/campaign/status/update/",
      {
        method: "POST",
        headers: { "Access-Token": token, "Content-Type": "application/json" },
        body: JSON.stringify({ advertiser_id: advertiserId, campaign_ids: [campaignId], operation_status: operationStatus }),
      },
    );
    const data = await res.json() as { code?: number; message?: string };
    if (!res.ok || (data.code !== undefined && data.code !== 0)) {
      throw new SaasAdsDashboardError(`TikTok Ads: ${data.message ?? "unknown error"}`, "API_ERROR");
    }
  }

  private async _createTikTokCampaign(token: string, advertiserId: string, input: AdsCreateCampaignInput): Promise<AdsCampaign> {
    const budgetMicro = input.dailyBudgetUsd; // TikTok uses USD directly
    const res = await this.fetchFn(
      "https://business-api.tiktok.com/open_api/v1.3/campaign/create/",
      {
        method: "POST",
        headers: { "Access-Token": token, "Content-Type": "application/json" },
        body: JSON.stringify({
          advertiser_id: advertiserId,
          campaign_name: input.name,
          objective_type: input.objective ?? "TRAFFIC",
          budget_mode: "BUDGET_MODE_DAY",
          budget: budgetMicro,
          operation_status: input.status === "ACTIVE" ? "ENABLE" : "DISABLE",
        }),
      },
    );
    const data = await res.json() as { code?: number; message?: string; data?: { campaign_id?: string } };
    if (!res.ok || (data.code !== undefined && data.code !== 0)) {
      throw new SaasAdsDashboardError(`TikTok Ads: ${data.message ?? "unknown error"}`, "API_ERROR");
    }
    return { id: data.data?.campaign_id ?? "", name: input.name, status: input.status ?? "PAUSED", platform: "tiktok", dailyBudget: input.dailyBudgetUsd };
  }

  private async _updateTikTokBudget(token: string, advertiserId: string, campaignId: string, dailyBudgetUsd: number): Promise<AdsCampaign> {
    const res = await this.fetchFn(
      "https://business-api.tiktok.com/open_api/v1.3/campaign/update/",
      {
        method: "POST",
        headers: { "Access-Token": token, "Content-Type": "application/json" },
        body: JSON.stringify({ advertiser_id: advertiserId, campaign_id: campaignId, budget: dailyBudgetUsd, budget_mode: "BUDGET_MODE_DAY" }),
      },
    );
    const data = await res.json() as { code?: number; message?: string };
    if (!res.ok || (data.code !== undefined && data.code !== 0)) {
      throw new SaasAdsDashboardError(`TikTok Ads: ${data.message ?? "unknown error"}`, "API_ERROR");
    }
    return { id: campaignId, name: "", status: "UNKNOWN", platform: "tiktok", dailyBudget: dailyBudgetUsd };
  }

  // ── Snapchat API ─────────────────────────────────────────────────────────────
  // Docs: https://marketingapi.snapchat.com/docs/

  private async _fetchSnapchatCampaigns(token: string, adAccountId: string): Promise<AdsCampaign[]> {
    const res = await this.fetchFn(
      `https://adsapi.snapchat.com/v1/adaccounts/${adAccountId}/campaigns`,
      { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } },
    );
    const data = await res.json() as { campaigns?: Array<{ campaign: Record<string, unknown> }>; request_status?: string; request_id?: string };
    if (!res.ok) throw new SaasAdsDashboardError(`Snapchat Ads: HTTP ${res.status}`, "API_ERROR");
    return (data.campaigns ?? []).map((item) => {
      const c = item.campaign;
      return {
        id: String(c["id"] ?? ""),
        name: String(c["name"] ?? ""),
        status: (c["status"] === "ACTIVE" ? "ACTIVE" : "PAUSED") as AdsCampaignStatus,
        platform: "snapchat" as AdsPlatform,
        dailyBudget: c["daily_budget_micro"] ? Number(c["daily_budget_micro"]) / 1_000_000 : null,
      };
    });
  }

  private async _setSnapchatCampaignStatus(token: string, campaignId: string, status: "ACTIVE" | "PAUSED"): Promise<void> {
    const res = await this.fetchFn(
      `https://adsapi.snapchat.com/v1/campaigns/${campaignId}`,
      {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ campaigns: [{ id: campaignId, status }] }),
      },
    );
    const data = await res.json() as { request_status?: string };
    if (!res.ok || data.request_status === "ERROR") {
      throw new SaasAdsDashboardError(`Snapchat Ads: HTTP ${res.status}`, "API_ERROR");
    }
  }

  private async _createSnapchatCampaign(token: string, adAccountId: string, input: AdsCreateCampaignInput): Promise<AdsCampaign> {
    const dailyBudgetMicro = Math.round(input.dailyBudgetUsd * 1_000_000);
    const res = await this.fetchFn(
      `https://adsapi.snapchat.com/v1/adaccounts/${adAccountId}/campaigns`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          campaigns: [{
            name: input.name,
            ad_account_id: adAccountId,
            status: input.status ?? "PAUSED",
            objective: input.objective ?? "WEB_CONVERSION",
            daily_budget_micro: dailyBudgetMicro,
          }],
        }),
      },
    );
    const data = await res.json() as { campaigns?: Array<{ campaign: { id?: string } }>; request_status?: string };
    if (!res.ok || data.request_status === "ERROR") {
      throw new SaasAdsDashboardError(`Snapchat Ads: HTTP ${res.status}`, "API_ERROR");
    }
    const id = data.campaigns?.[0]?.campaign.id ?? "";
    return { id, name: input.name, status: input.status ?? "PAUSED", platform: "snapchat", dailyBudget: input.dailyBudgetUsd };
  }

  private async _updateSnapchatBudget(token: string, campaignId: string, dailyBudgetUsd: number): Promise<AdsCampaign> {
    const dailyBudgetMicro = Math.round(dailyBudgetUsd * 1_000_000);
    const res = await this.fetchFn(
      `https://adsapi.snapchat.com/v1/campaigns/${campaignId}`,
      {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ campaigns: [{ id: campaignId, daily_budget_micro: dailyBudgetMicro }] }),
      },
    );
    const data = await res.json() as { request_status?: string };
    if (!res.ok || data.request_status === "ERROR") {
      throw new SaasAdsDashboardError(`Snapchat Ads: HTTP ${res.status}`, "API_ERROR");
    }
    return { id: campaignId, name: "", status: "UNKNOWN", platform: "snapchat", dailyBudget: dailyBudgetUsd };
  }

  // ── Update budget ───────────────────────────────────────────────────────────

  private async _updateMetaBudget(token: string, campaignId: string, dailyBudgetUsd: number): Promise<AdsCampaign> {
    const budgetCents = Math.round(dailyBudgetUsd * 100);
    const res = await this.fetchFn(
      `https://graph.facebook.com/v19.0/${campaignId}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ daily_budget: budgetCents, access_token: token }),
      },
    );
    const data = await res.json() as { success?: boolean; error?: { message: string } };
    if (!res.ok || data.error) throw new SaasAdsDashboardError(`Meta Ads: ${data.error?.message ?? "unknown error"}`, "API_ERROR");
    return { id: campaignId, name: "", status: "UNKNOWN", platform: "meta", dailyBudget: dailyBudgetUsd };
  }

  // ─── Attribution bridge ────────────────────────────────────────────────────

  async linkCampaign(tenantId: string, input: AdsCampaignLinkInput): Promise<AdsCampaignLink> {
    if (!input.externalCampaignId?.trim()) throw new SaasAdsDashboardError("externalCampaignId required", "VALIDATION");
    if (!input.utmCampaign?.trim()) throw new SaasAdsDashboardError("utmCampaign required", "VALIDATION");
    const rows = await this.db.query<LinkRow>(
      `INSERT INTO saas_ads_campaign_links
         (tenant_id, platform, external_campaign_id, external_campaign_name, utm_campaign, utm_source, utm_medium)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (tenant_id, platform, external_campaign_id) DO UPDATE SET
         external_campaign_name = EXCLUDED.external_campaign_name,
         utm_campaign = EXCLUDED.utm_campaign,
         utm_source   = EXCLUDED.utm_source,
         utm_medium   = EXCLUDED.utm_medium
       RETURNING *`,
      [tenantId, input.platform, input.externalCampaignId, input.externalCampaignName ?? null,
       input.utmCampaign, input.utmSource ?? null, input.utmMedium ?? null],
    );
    return rowToLink(rows[0]);
  }

  async listCampaignLinks(tenantId: string): Promise<AdsCampaignLink[]> {
    const rows = await this.db.query<LinkRow>(
      `SELECT * FROM saas_ads_campaign_links WHERE tenant_id=$1 ORDER BY created_at DESC`,
      [tenantId],
    );
    return rows.map(rowToLink);
  }

  async getAttributedRoas(tenantId: string, days = 30, model: AdsAttributionModel = "linear"): Promise<AttributedRoasRow[]> {
    const links = await this.listCampaignLinks(tenantId);
    if (!links.length) return [];

    // Spend from cache aggregated by platform
    const dateEnd = new Date().toISOString().slice(0, 10);
    const dateStart = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
    const spendRows = await this.db.query<Record<string, unknown>>(
      `SELECT a.platform, SUM(c.spend::numeric) AS total_spend
       FROM saas_ads_metrics_cache c
       JOIN saas_ads_connections a ON a.id = c.connection_id
       WHERE a.tenant_id = $1 AND c.date_start >= $2 AND c.date_end <= $3
       GROUP BY a.platform`,
      [tenantId, dateStart, dateEnd],
    );
    const spendByPlatform = new Map<string, number>();
    for (const r of spendRows) {
      spendByPlatform.set(String(r.platform), Number(r.total_spend ?? 0));
    }

    // Attribution: run inline model logic using same DB
    const attrRows = await this.db.query<Record<string, unknown>>(
      `SELECT contact_id, utm_source, utm_medium, utm_campaign, event_type, created_at
       FROM saas_lead_attribution
       WHERE tenant_id = $1
         AND created_at >= NOW() - ($2 || ' days')::INTERVAL
         AND contact_id IN (
           SELECT DISTINCT contact_id FROM saas_lead_attribution
           WHERE tenant_id = $1 AND event_type = 'conversion'
             AND created_at >= NOW() - ($2 || ' days')::INTERVAL
             AND contact_id IS NOT NULL
         )
       ORDER BY contact_id, created_at`,
      [tenantId, String(days)],
    );

    // Group by contact
    const byContact = new Map<string, typeof attrRows>();
    for (const r of attrRows) {
      const cid = String(r.contact_id);
      if (!byContact.has(cid)) byContact.set(cid, []);
      byContact.get(cid)!.push(r);
    }

    const HALF_LIFE_MS = 7 * 86_400_000;
    // credit[utmCampaign] = { credit, conversions }
    const creditMap = new Map<string, { credit: number; conversions: number }>();

    for (const events of byContact.values()) {
      const tps = events.filter(e => e.event_type !== "conversion");
      const convCount = events.filter(e => e.event_type === "conversion").length;
      if (!tps.length || !convCount) continue;
      const n = tps.length;

      const weights = tps.map((tp, idx) => {
        if (model === "first_touch") return idx === 0 ? 1 : 0;
        if (model === "last_touch") return idx === n - 1 ? 1 : 0;
        if (model === "linear") return 1 / n;
        const lastTs = new Date(events[events.length - 1].created_at as string).getTime();
        const tpTs   = new Date(tp.created_at as string).getTime();
        return Math.exp(-Math.abs(lastTs - tpTs) / HALF_LIFE_MS);
      });

      const totalW = weights.reduce((s, w) => s + w, 0);
      tps.forEach((tp, idx) => {
        const w = totalW > 0 ? weights[idx] / totalW : 0;
        if (w === 0 || !tp.utm_campaign) return;
        const key = String(tp.utm_campaign);
        const existing = creditMap.get(key);
        if (existing) {
          existing.credit += w * convCount;
          existing.conversions += convCount;
        } else {
          creditMap.set(key, { credit: w * convCount, conversions: convCount });
        }
      });
    }

    return links.map(link => {
      const spend = spendByPlatform.get(link.platform) ?? 0;
      const c = creditMap.get(link.utmCampaign);
      const attrConversions = c?.conversions ?? 0;
      const attrCredit = Math.round((c?.credit ?? 0) * 1000) / 1000;
      return {
        link,
        spend,
        attributedCredit: attrCredit,
        attributedConversions: attrConversions,
        attributedRoas: spend > 0 && attrConversions > 0 ? attrConversions / spend : null,
        model,
      };
    });
  }

  private async _updateGoogleBudget(token: string, customerId: string, extra: Record<string, unknown>, campaignId: string, dailyBudgetUsd: number): Promise<AdsCampaign> {
    const cleanId = customerId.replace(/-/g, "");
    const budgetMicros = Math.round(dailyBudgetUsd * 1_000_000);
    const res = await this.fetchFn(
      `https://googleads.googleapis.com/v14/customers/${cleanId}/campaigns:mutate`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "developer-token": String(extra["developerToken"] ?? ""),
        },
        body: JSON.stringify({
          operations: [{
            update: {
              resourceName: `customers/${cleanId}/campaigns/${campaignId}`,
              campaignBudget: { amountMicros: budgetMicros },
            },
            updateMask: "campaignBudget.amountMicros",
          }],
        }),
      },
    );
    const data = await res.json() as { error?: { message: string } };
    if (!res.ok || data.error) throw new SaasAdsDashboardError(`Google Ads: ${data.error?.message ?? "unknown error"}`, "API_ERROR");
    return { id: campaignId, name: "", status: "UNKNOWN", platform: "google", dailyBudget: dailyBudgetUsd };
  }

  // ── LinkedIn Marketing API ─────────────────────────────────────────────────

  private _linkedinHeaders(token: string): Record<string, string> {
    return {
      Authorization: `Bearer ${token}`,
      "Linkedin-Version": "202401",
      "X-Restli-Protocol-Version": "2.0.0",
      "Content-Type": "application/json",
    };
  }

  private _linkedinAccountUrn(accountId: string): string {
    return accountId.startsWith("urn:") ? accountId : `urn:li:sponsoredAccount:${accountId}`;
  }

  private async _resolveLinkedInCampaignGroupUrn(
    token: string,
    accountId: string,
    extra: Record<string, unknown>,
  ): Promise<string> {
    const fromConfig = extra["campaignGroupUrn"] ?? extra["campaignGroupId"];
    if (typeof fromConfig === "string" && fromConfig.trim()) {
      return fromConfig.startsWith("urn:") ? fromConfig : `urn:li:sponsoredCampaignGroup:${fromConfig}`;
    }
    const accountUrn = this._linkedinAccountUrn(accountId);
    const listRes = await this.fetchFn(
      `https://api.linkedin.com/rest/adAccounts/${encodeURIComponent(accountUrn)}/adCampaignGroups?q=search&search=(status:(values:List(ACTIVE,DRAFT)))`,
      { headers: this._linkedinHeaders(token) },
    );
    const listData = await listRes.json() as { elements?: Array<{ id?: number | string }> };
    if (listRes.ok && listData.elements?.length) {
      const id = listData.elements[0].id;
      return typeof id === "string" && id.startsWith("urn:") ? id : `urn:li:sponsoredCampaignGroup:${id}`;
    }
    const createRes = await this.fetchFn(
      `https://api.linkedin.com/rest/adAccounts/${encodeURIComponent(accountUrn)}/adCampaignGroups`,
      {
        method: "POST",
        headers: this._linkedinHeaders(token),
        body: JSON.stringify({
          account: accountUrn,
          name: "Nelvyon Campaigns",
          status: "ACTIVE",
          runSchedule: { start: Date.now() },
        }),
      },
    );
    const created = await createRes.json() as { id?: number | string };
    if (!createRes.ok || created.id == null) {
      throw new SaasAdsDashboardError("LinkedIn Ads: could not resolve campaign group", "API_ERROR");
    }
    const id = created.id;
    return typeof id === "string" && id.startsWith("urn:") ? id : `urn:li:sponsoredCampaignGroup:${id}`;
  }

  private async _fetchLinkedInMetrics(
    token: string,
    accountId: string,
    dateStart: string,
    dateEnd: string,
  ): Promise<Omit<AdsMetrics, "platform" | "dateStart" | "dateEnd" | "fromCache" | "fetchedAt">> {
    const [sy, sm, sd] = dateStart.split("-").map(Number);
    const [ey, em, ed] = dateEnd.split("-").map(Number);
    const accountUrn = accountId.startsWith("urn:") ? accountId : `urn:li:sponsoredAccount:${accountId}`;
    const q = new URLSearchParams({
      q: "analytics",
      pivot: "ACCOUNT",
      timeGranularity: "ALL",
      dateRange: `(start:(year:${sy},month:${sm},day:${sd}),end:(year:${ey},month:${em},day:${ed}))`,
      accounts: `List(${accountUrn})`,
      fields: "costInLocalCurrency,impressions,clicks,externalWebsiteConversions",
    });
    const res = await this.fetchFn(`https://api.linkedin.com/rest/adAnalytics?${q}`, {
      headers: this._linkedinHeaders(token),
    });
    const data = await res.json() as { elements?: Array<Record<string, number>> };
    if (!res.ok) throw new SaasAdsDashboardError(`LinkedIn Ads: HTTP ${res.status}`, "API_ERROR");
    const el = data.elements?.[0] ?? {};
    const spend = Number(el.costInLocalCurrency ?? 0);
    const impressions = Number(el.impressions ?? 0);
    const clicks = Number(el.clicks ?? 0);
    const conversions = Number(el.externalWebsiteConversions ?? 0);
    const ctr = impressions > 0 ? (clicks / impressions) * 100 : null;
    const cpc = clicks > 0 ? spend / clicks : null;
    return { spend, impressions, clicks, conversions, ctr, cpc, roas: null };
  }

  private async _fetchLinkedInCampaigns(token: string, accountId: string): Promise<AdsCampaign[]> {
    const accountUrn = accountId.startsWith("urn:") ? accountId : `urn:li:sponsoredAccount:${accountId}`;
    const res = await this.fetchFn(
      `https://api.linkedin.com/rest/adAccounts/${encodeURIComponent(accountUrn)}/adCampaigns?q=search&search=(status:(values:List(ACTIVE,PAUSED)))`,
      { headers: this._linkedinHeaders(token) },
    );
    const data = await res.json() as { elements?: Array<Record<string, unknown>> };
    if (!res.ok) throw new SaasAdsDashboardError(`LinkedIn Ads: HTTP ${res.status}`, "API_ERROR");
    return (data.elements ?? []).map((c) => ({
      id: String(c.id ?? ""),
      name: String(c.name ?? ""),
      status: (c.status === "ACTIVE" ? "ACTIVE" : "PAUSED") as AdsCampaignStatus,
      platform: "linkedin" as AdsPlatform,
      dailyBudget: c.dailyBudget != null && typeof c.dailyBudget === "object"
        ? Number((c.dailyBudget as { amount?: number }).amount ?? 0) || null
        : null,
    }));
  }

  private async _createLinkedInCampaign(
    token: string,
    accountId: string,
    extra: Record<string, unknown>,
    input: AdsCreateCampaignInput,
  ): Promise<AdsCampaign> {
    const accountUrn = this._linkedinAccountUrn(accountId);
    const campaignGroup = await this._resolveLinkedInCampaignGroupUrn(token, accountId, extra);
    const res = await this.fetchFn(
      `https://api.linkedin.com/rest/adAccounts/${encodeURIComponent(accountUrn)}/adCampaigns`,
      {
        method: "POST",
        headers: this._linkedinHeaders(token),
        body: JSON.stringify({
          account: accountUrn,
          campaignGroup,
          name: input.name,
          status: input.status ?? "PAUSED",
          type: "SPONSORED_UPDATES",
          costType: "CPM",
          dailyBudget: { currencyCode: "USD", amount: String(input.dailyBudgetUsd) },
          locale: { country: "US", language: "en" },
        }),
      },
    );
    const data = await res.json() as { id?: number | string; name?: string; status?: string };
    if (!res.ok || data.id == null) {
      throw new SaasAdsDashboardError(`LinkedIn Ads: HTTP ${res.status}`, "API_ERROR");
    }
    const id = typeof data.id === "string" ? data.id : String(data.id);
    return {
      id,
      name: input.name,
      status: (data.status === "ACTIVE" ? "ACTIVE" : "PAUSED") as AdsCampaignStatus,
      platform: "linkedin",
      dailyBudget: input.dailyBudgetUsd,
    };
  }

  private async _updateLinkedInBudget(token: string, campaignId: string, dailyBudgetUsd: number): Promise<AdsCampaign> {
    const campaignUrn = campaignId.startsWith("urn:") ? campaignId : `urn:li:sponsoredCampaign:${campaignId}`;
    const res = await this.fetchFn(
      `https://api.linkedin.com/rest/adCampaigns/${encodeURIComponent(campaignUrn)}`,
      {
        method: "POST",
        headers: { ...this._linkedinHeaders(token), "X-RestLi-Method": "PARTIAL_UPDATE" },
        body: JSON.stringify({
          patch: {
            $set: {
              dailyBudget: { currencyCode: "USD", amount: String(dailyBudgetUsd) },
            },
          },
        }),
      },
    );
    if (!res.ok) throw new SaasAdsDashboardError(`LinkedIn Ads: HTTP ${res.status}`, "API_ERROR");
    return { id: campaignId, name: "", status: "UNKNOWN", platform: "linkedin", dailyBudget: dailyBudgetUsd };
  }

  private async _setLinkedInCampaignStatus(
    token: string,
    campaignId: string,
    status: "ACTIVE" | "PAUSED",
  ): Promise<void> {
    const campaignUrn = campaignId.startsWith("urn:") ? campaignId : `urn:li:sponsoredCampaign:${campaignId}`;
    const res = await this.fetchFn(
      `https://api.linkedin.com/rest/adCampaigns/${encodeURIComponent(campaignUrn)}`,
      {
        method: "POST",
        headers: { ...this._linkedinHeaders(token), "X-RestLi-Method": "PARTIAL_UPDATE" },
        body: JSON.stringify({ patch: { $set: { status } } }),
      },
    );
    if (!res.ok) throw new SaasAdsDashboardError(`LinkedIn Ads: HTTP ${res.status}`, "API_ERROR");
  }

  private async _fetchTikTokMetrics(
    token: string,
    advertiserId: string,
    dateStart: string,
    dateEnd: string,
  ): Promise<Omit<AdsMetrics, "platform" | "dateStart" | "dateEnd" | "fromCache" | "fetchedAt">> {
    const res = await this.fetchFn(
      "https://business-api.tiktok.com/open_api/v1.3/report/integrated/get/",
      {
        method: "POST",
        headers: { "Access-Token": token, "Content-Type": "application/json" },
        body: JSON.stringify({
          advertiser_id: advertiserId,
          report_type: "BASIC",
          data_level: "AUCTION_ADVERTISER",
          dimensions: ["advertiser_id"],
          metrics: ["spend", "impressions", "clicks", "conversion"],
          start_date: dateStart,
          end_date: dateEnd,
        }),
      },
    );
    const data = await res.json() as { code?: number; message?: string; data?: { list?: Array<Record<string, unknown>> } };
    if (!res.ok || (data.code !== undefined && data.code !== 0)) {
      throw new SaasAdsDashboardError(`TikTok Ads: ${data.message ?? "unknown error"}`, "API_ERROR");
    }
    const row = data.data?.list?.[0]?.metrics as Record<string, number> | undefined ?? {};
    const spend = Number(row.spend ?? 0);
    const impressions = Number(row.impressions ?? 0);
    const clicks = Number(row.clicks ?? 0);
    const conversions = Number(row.conversion ?? 0);
    const ctr = impressions > 0 ? (clicks / impressions) * 100 : null;
    const cpc = clicks > 0 ? spend / clicks : null;
    return { spend, impressions, clicks, conversions, ctr, cpc, roas: null };
  }

  private async _fetchSnapchatMetrics(
    token: string,
    adAccountId: string,
    dateStart: string,
    dateEnd: string,
  ): Promise<Omit<AdsMetrics, "platform" | "dateEnd" | "dateStart" | "fromCache" | "fetchedAt">> {
    const res = await this.fetchFn(
      `https://adsapi.snapchat.com/v1/adaccounts/${adAccountId}/stats?granularity=TOTAL&start_time=${dateStart}T00:00:00Z&end_time=${dateEnd}T23:59:59Z&fields=spend,impressions,swipes,conversion_purchases`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const data = await res.json() as { total_stats?: Array<{ total_stat: Record<string, unknown> }> };
    if (!res.ok) throw new SaasAdsDashboardError(`Snapchat Ads: HTTP ${res.status}`, "API_ERROR");
    const stat = data.total_stats?.[0]?.total_stat ?? {};
    const spend = Number(stat.spend ?? 0) / 1_000_000;
    const impressions = Number(stat.impressions ?? 0);
    const clicks = Number(stat.swipes ?? 0);
    const conversions = Number(stat.conversion_purchases ?? 0);
    const ctr = impressions > 0 ? (clicks / impressions) * 100 : null;
    const cpc = clicks > 0 ? spend / clicks : null;
    return { spend, impressions, clicks, conversions, ctr, cpc, roas: null };
  }
}

let _instance: SaasAdsDashboardService | null = null;
export function getSaasAdsDashboardService(): SaasAdsDashboardService {
  if (!_instance) _instance = new SaasAdsDashboardService(DbClient.getInstance());
  return _instance;
}
export function resetSaasAdsDashboardServiceForTests(): void { _instance = null; }
