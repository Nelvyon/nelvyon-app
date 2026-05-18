import type { DbClient } from "../db/DbClient";
import { DbClient as DbClientClass } from "../db/DbClient";
import { OsAgentError } from "../os-agents/OsAgentError";

const GOOGLE_ADS_API_VERSION = "v17";
const BASE_URL = `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}`;

export interface GoogleAdsCredentials {
  userId: string;
  customerId: string | null;
  accessToken: string;
  refreshToken: string;
  tokenExpiry: string | null;
  isActive: boolean;
}

export interface GoogleAdsCampaign {
  id: string;
  name: string;
  status: string;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
}

export interface GoogleAdsCampaignMetrics {
  campaignId: string;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
}

export interface CreateCampaignParams {
  name: string;
  advertisingChannelType?: "SEARCH" | "DISPLAY" | "VIDEO";
  dailyBudgetMicros?: number;
}

export interface GoogleAdsAccountSummary {
  totalSpend: number;
  totalConversions: number;
  avgCpc: number;
  ctr: number;
}

export type GoogleAdsServiceDeps = {
  db?: Pick<DbClient, "query">;
  fetchFn?: typeof fetch;
};

type MetricsJson = Record<string, unknown>;

type SearchResultRow = {
  campaign?: { id?: string; name?: string; status?: string };
  metrics?: MetricsJson;
};

type MutateResponse = {
  mutateOperationResponses?: ReadonlyArray<{
    campaignResult?: { resourceName?: string };
  }>;
};

function toNum(v: string | number | undefined | null): number {
  if (v === undefined || v === null) return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function microsToCurrency(micros: number): number {
  return micros / 1_000_000;
}

function readMetric(m: MetricsJson | undefined, camel: string, snake: string): number {
  if (!m) return 0;
  const raw = (m[camel] ?? m[snake]) as string | number | undefined;
  return toNum(raw);
}

function getDeveloperToken(): string {
  const t = process.env.GOOGLE_ADS_DEVELOPER_TOKEN?.trim();
  if (!t) {
    throw new OsAgentError(
      "GOOGLE_ADS_DEVELOPER_TOKEN is not defined. Set it in the environment to call Google Ads API.",
      "google_ads_config",
    );
  }
  return t;
}

export class GoogleAdsService {
  constructor(private readonly deps: GoogleAdsServiceDeps = {}) {}

  private get db(): Pick<DbClient, "query"> {
    return this.deps.db ?? DbClientClass.getInstance();
  }

  private get fetchImpl(): typeof fetch {
    return this.deps.fetchFn ?? globalThis.fetch.bind(globalThis);
  }

  async saveCredentials(
    userId: string,
    customerId: string,
    accessToken: string,
    refreshToken: string,
    tokenExpiry: Date,
  ): Promise<void> {
    await this.db.query(
      `INSERT INTO integration_google_ads
         (user_id, customer_id, access_token, refresh_token, token_expiry, is_active, updated_at)
       VALUES ($1::uuid, $2, $3, $4, $5::timestamptz, true, NOW())
       ON CONFLICT (user_id)
       DO UPDATE SET
         customer_id = EXCLUDED.customer_id,
         access_token = EXCLUDED.access_token,
         refresh_token = EXCLUDED.refresh_token,
         token_expiry = EXCLUDED.token_expiry,
         is_active = true,
         updated_at = NOW()`,
      [userId, customerId, accessToken, refreshToken, tokenExpiry.toISOString()],
    );
  }

  async getCredentials(userId: string): Promise<GoogleAdsCredentials | null> {
    const rows = await this.db.query<{
      user_id: string;
      customer_id: string | null;
      access_token: string | null;
      refresh_token: string | null;
      token_expiry: Date | string | null;
      is_active: boolean;
    }>(
      `SELECT user_id::text, customer_id, access_token, refresh_token, token_expiry, is_active
       FROM integration_google_ads
       WHERE user_id = $1::uuid AND is_active = true
       LIMIT 1`,
      [userId],
    );
    const r = rows[0];
    if (!r || !r.access_token || !r.refresh_token || !r.customer_id) return null;
    return {
      userId: r.user_id,
      customerId: r.customer_id,
      accessToken: r.access_token,
      refreshToken: r.refresh_token,
      tokenExpiry: r.token_expiry ? (typeof r.token_expiry === "string" ? r.token_expiry : r.token_expiry.toISOString()) : null,
      isActive: r.is_active,
    };
  }

  private async requireCredentials(userId: string): Promise<GoogleAdsCredentials> {
    const c = await this.getCredentials(userId);
    if (!c) {
      throw new OsAgentError("Google Ads is not connected for this user.", "google_ads_auth");
    }
    if (c.tokenExpiry) {
      const exp = new Date(c.tokenExpiry).getTime();
      if (Number.isFinite(exp) && Date.now() > exp - 60_000) {
        throw new OsAgentError("Google Ads access token expired. Reconnect OAuth.", "google_ads_auth");
      }
    }
    return c;
  }

  private headers(accessToken: string): Record<string, string> {
    return {
      Authorization: `Bearer ${accessToken}`,
      "developer-token": getDeveloperToken(),
      "Content-Type": "application/json",
    };
  }

  private async postSearch(customerId: string, accessToken: string, query: string): Promise<unknown> {
    const url = `${BASE_URL}/customers/${customerId}/googleAds:search`;
    const res = await this.fetchImpl(url, {
      method: "POST",
      headers: this.headers(accessToken),
      body: JSON.stringify({ query }),
    });
    const text = await res.text();
    let body: unknown;
    try {
      body = JSON.parse(text) as unknown;
    } catch {
      throw new OsAgentError(`Google Ads returned non-JSON (HTTP ${res.status})`, "google_ads_http");
    }
    if (!res.ok) {
      const errMsg =
        typeof body === "object" && body !== null && "error" in body
          ? JSON.stringify((body as { error?: unknown }).error).slice(0, 400)
          : text.slice(0, 400);
      throw new OsAgentError(`Google Ads API error (HTTP ${res.status}): ${errMsg}`, "google_ads_api");
    }
    return body;
  }

  async getCampaigns(userId: string): Promise<GoogleAdsCampaign[]> {
    const creds = await this.requireCredentials(userId);
    const customerId = creds.customerId!;
    const gaql = `SELECT campaign.id, campaign.name, campaign.status,
      metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions
      FROM campaign
      WHERE segments.date DURING LAST_30_DAYS
      ORDER BY campaign.id`;
    const body = (await this.postSearch(customerId, creds.accessToken, gaql)) as { results?: SearchResultRow[] };
    const results = body.results ?? [];
    const agg = new Map<string, GoogleAdsCampaign>();
    for (const row of results) {
      const id = String(row.campaign?.id ?? "");
      const name = String(row.campaign?.name ?? "");
      const status = String(row.campaign?.status ?? "");
      const impressions = readMetric(row.metrics, "impressions", "impressions");
      const clicks = readMetric(row.metrics, "clicks", "clicks");
      const costMicros = readMetric(row.metrics, "costMicros", "cost_micros");
      const conversions = readMetric(row.metrics, "conversions", "conversions");
      const prev = agg.get(id);
      if (!prev) {
        agg.set(id, {
          id,
          name,
          status,
          impressions,
          clicks,
          cost: microsToCurrency(costMicros),
          conversions,
        });
      } else {
        prev.impressions += impressions;
        prev.clicks += clicks;
        prev.cost += microsToCurrency(costMicros);
        prev.conversions += conversions;
      }
    }
    return [...agg.values()];
  }

  async getCampaignMetrics(
    userId: string,
    campaignId: string,
    dateRange: { start: string; end: string },
  ): Promise<GoogleAdsCampaignMetrics> {
    if (!/^\d+$/.test(campaignId)) {
      throw new OsAgentError("campaignId must be numeric", "google_ads_validation");
    }
    const creds = await this.requireCredentials(userId);
    const customerId = creds.customerId!;
    const gaql = `SELECT campaign.id, metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions
      FROM campaign
      WHERE campaign.id = ${campaignId}
        AND segments.date BETWEEN '${dateRange.start.replace(/[^0-9-]/g, "")}' AND '${dateRange.end.replace(/[^0-9-]/g, "")}'`;
    const body = (await this.postSearch(customerId, creds.accessToken, gaql)) as { results?: SearchResultRow[] };
    let impressions = 0;
    let clicks = 0;
    let costMicros = 0;
    let conversions = 0;
    for (const row of body.results ?? []) {
      impressions += readMetric(row.metrics, "impressions", "impressions");
      clicks += readMetric(row.metrics, "clicks", "clicks");
      costMicros += readMetric(row.metrics, "costMicros", "cost_micros");
      conversions += readMetric(row.metrics, "conversions", "conversions");
    }
    return {
      campaignId,
      impressions,
      clicks,
      cost: microsToCurrency(costMicros),
      conversions,
    };
  }

  async createCampaign(userId: string, params: CreateCampaignParams): Promise<{ campaignId: string }> {
    const creds = await this.requireCredentials(userId);
    const customerId = creds.customerId!;
    const channel = params.advertisingChannelType ?? "SEARCH";
    const budgetMicros = params.dailyBudgetMicros ?? 10_000_000;

    const url = `${BASE_URL}/customers/${customerId}/googleAds:mutate`;
    const mutateBody = {
      mutateOperations: [
        {
          campaignBudgetOperation: {
            create: {
              name: `Budget ${params.name} ${Date.now()}`,
              amountMicros: String(budgetMicros),
              explicitlyShared: false,
              deliveryMethod: "STANDARD",
            },
          },
        },
        {
          campaignOperation: {
            create: {
              name: params.name,
              advertisingChannelType: channel,
              status: "PAUSED",
              campaignBudget: `customers/${customerId}/campaignBudgets/-1`,
            },
          },
        },
      ],
    };

    const res = await this.fetchImpl(url, {
      method: "POST",
      headers: this.headers(creds.accessToken),
      body: JSON.stringify(mutateBody),
    });
    const text = await res.text();
    let body: MutateResponse;
    try {
      body = JSON.parse(text) as MutateResponse;
    } catch {
      throw new OsAgentError(`Google Ads mutate non-JSON (HTTP ${res.status})`, "google_ads_http");
    }
    if (!res.ok) {
      throw new OsAgentError(`Google Ads mutate failed (HTTP ${res.status}): ${text.slice(0, 400)}`, "google_ads_api");
    }

    const responses = body.mutateOperationResponses ?? [];
    let campaignResource = "";
    for (const r of responses) {
      const rn = r.campaignResult?.resourceName;
      if (rn) campaignResource = rn;
    }
    const campaignIdMatch = campaignResource.match(/campaigns\/(\d+)/);
    const campaignId = campaignIdMatch?.[1] ?? "";
    return { campaignId };
  }

  async getAccountSummary(userId: string): Promise<GoogleAdsAccountSummary> {
    const creds = await this.requireCredentials(userId);
    const customerId = creds.customerId!;
    const gaql = `SELECT metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions
      FROM customer
      WHERE segments.date DURING LAST_30_DAYS`;
    const body = (await this.postSearch(customerId, creds.accessToken, gaql)) as { results?: SearchResultRow[] };
    let impressions = 0;
    let clicks = 0;
    let costMicros = 0;
    let conversions = 0;
    for (const row of body.results ?? []) {
      impressions += readMetric(row.metrics, "impressions", "impressions");
      clicks += readMetric(row.metrics, "clicks", "clicks");
      costMicros += readMetric(row.metrics, "costMicros", "cost_micros");
      conversions += readMetric(row.metrics, "conversions", "conversions");
    }
    const spend = microsToCurrency(costMicros);
    const avgCpc = clicks > 0 ? spend / clicks : 0;
    const ctr = impressions > 0 ? clicks / impressions : 0;
    return {
      totalSpend: spend,
      totalConversions: conversions,
      avgCpc,
      ctr,
    };
  }

  async revokeAccess(userId: string): Promise<void> {
    await this.db.query(`UPDATE integration_google_ads SET is_active = false, updated_at = NOW() WHERE user_id = $1::uuid`, [
      userId,
    ]);
  }
}

let cachedGoogleAds: GoogleAdsService | undefined;

export function getGoogleAdsService(): GoogleAdsService {
  if (!cachedGoogleAds) cachedGoogleAds = new GoogleAdsService();
  return cachedGoogleAds;
}

export function resetGoogleAdsServiceForTests(): void {
  cachedGoogleAds = undefined;
}
