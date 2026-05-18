import { createLogger } from "../../logger";
import { GoogleOAuthProvider } from "../../oauth/GoogleOAuthProvider";
import { OAuthService } from "../../oauth/OAuthService";

const GOOGLE_ADS_API_VERSION = "v17";
const SEARCH_CONSOLE_BASE = "https://searchconsole.googleapis.com/webmasters/v3";
const ANALYTICS_DATA_BASE = "https://analyticsdata.googleapis.com/v1beta";
const GOOGLE_ADS_BASE = `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}`;

export interface SearchConsoleQueryRow {
  query: string;
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface SearchConsoleData {
  topQueries: SearchConsoleQueryRow[];
  topPages: SearchConsoleQueryRow[];
  totalClicks: number;
  totalImpressions: number;
  avgCtr: number;
  avgPosition: number;
}

export interface AnalyticsChannelRow {
  source: string;
  medium: string;
  sessions: number;
  conversions: number;
  revenue: number;
  bounceRate: number;
}

export interface AnalyticsData {
  topChannels: AnalyticsChannelRow[];
  totalSessions: number;
  totalConversions: number;
  totalRevenue: number;
  overallBounceRate: number;
}

export interface GoogleAdsCampaignRow {
  campaignName: string;
  status: string;
  clicks: number;
  impressions: number;
  ctr: number;
  avgCpc: number;
  conversions: number;
  costEuros: number;
}

export interface GoogleAdsPerformanceData {
  campaigns: GoogleAdsCampaignRow[];
  totalSpend: number;
  totalConversions: number;
  avgRoas: number;
}

function isoDateDaysAgo(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

let inst: GoogleDataFetcher | undefined;

export class GoogleDataFetcher {
  private readonly oauth = OAuthService.instance();
  private readonly logger = createLogger("google_data");

  static instance(): GoogleDataFetcher {
    if (!inst) inst = new GoogleDataFetcher();
    return inst;
  }

  static reset(): void {
    inst = undefined;
  }

  private async getHeaders(userId: string): Promise<Record<string, string> | null> {
    const connection = await this.oauth.getConnection(userId, "google");
    if (!connection) return null;

    let accessToken = connection.accessToken;
    const expiresAt = connection.expiresAt;
    if (expiresAt && expiresAt < new Date()) {
      if (!connection.refreshToken) return null;
      try {
        const refreshed = await new GoogleOAuthProvider().refreshAccessToken(connection.refreshToken);
        accessToken = refreshed.accessToken;
        await this.oauth.saveConnection(userId, "google", {
          accessToken: refreshed.accessToken,
          refreshToken: connection.refreshToken,
          expiresAt: refreshed.expiresAt,
          accountId: connection.accountId,
          accountName: connection.accountName,
          scopes: connection.scopes,
        });
      } catch (err: unknown) {
        this.logger.warn("google_token_refresh_failed", {
          userId,
          error: err instanceof Error ? err.message : String(err),
        });
        return null;
      }
    }

    return { Authorization: `Bearer ${accessToken}` };
  }

  async getSearchConsoleData(
    userId: string,
    siteUrl: string,
    days: number = 30,
  ): Promise<SearchConsoleData | null> {
    const headers = await this.getHeaders(userId);
    if (!headers) return null;

    const url = `${SEARCH_CONSOLE_BASE}/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: isoDateDaysAgo(days),
          endDate: todayIso(),
          dimensions: ["query", "page"],
          rowLimit: 25,
          dataState: "final",
        }),
      });
      if (!res.ok) {
        this.logger.warn("search_console_fetch_failed", { userId, status: res.status });
        return null;
      }

      const json = (await res.json()) as {
        rows?: Array<{
          keys?: string[];
          clicks?: number;
          impressions?: number;
          ctr?: number;
          position?: number;
        }>;
      };

      const rows: SearchConsoleQueryRow[] = (json.rows ?? []).map((r) => ({
        query: r.keys?.[0] ?? "",
        page: r.keys?.[1] ?? "",
        clicks: r.clicks ?? 0,
        impressions: r.impressions ?? 0,
        ctr: r.ctr ?? 0,
        position: r.position ?? 0,
      }));

      const totalClicks = rows.reduce((s, r) => s + r.clicks, 0);
      const totalImpressions = rows.reduce((s, r) => s + r.impressions, 0);
      const avgCtr =
        totalImpressions > 0 ? round2((totalClicks / totalImpressions) * 100) : 0;
      const avgPosition =
        rows.length > 0 ? round2(rows.reduce((s, r) => s + r.position, 0) / rows.length) : 0;

      const topQueries = [...rows].sort((a, b) => b.clicks - a.clicks).slice(0, 10);
      const topPages = [...rows].sort((a, b) => b.clicks - a.clicks).slice(0, 10);

      return {
        topQueries,
        topPages,
        totalClicks,
        totalImpressions,
        avgCtr,
        avgPosition,
      };
    } catch (err: unknown) {
      this.logger.warn("search_console_fetch_error", {
        userId,
        error: err instanceof Error ? err.message : String(err),
      });
      return null;
    }
  }

  async getAnalyticsData(
    userId: string,
    propertyId: string,
    days: number = 30,
  ): Promise<AnalyticsData | null> {
    const headers = await this.getHeaders(userId);
    if (!headers) return null;

    const url = `${ANALYTICS_DATA_BASE}/properties/${propertyId}:runReport`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          dateRanges: [{ startDate: `${days}daysAgo`, endDate: "today" }],
          dimensions: [{ name: "sessionSource" }, { name: "sessionMedium" }],
          metrics: [
            { name: "sessions" },
            { name: "conversions" },
            { name: "totalRevenue" },
            { name: "bounceRate" },
          ],
        }),
      });
      if (!res.ok) {
        this.logger.warn("analytics_fetch_failed", { userId, status: res.status });
        return null;
      }

      const json = (await res.json()) as {
        rows?: Array<{
          dimensionValues?: Array<{ value?: string }>;
          metricValues?: Array<{ value?: string }>;
        }>;
      };

      const channels: AnalyticsChannelRow[] = (json.rows ?? []).map((row) => {
        const dims = row.dimensionValues ?? [];
        const metrics = row.metricValues ?? [];
        return {
          source: dims[0]?.value ?? "",
          medium: dims[1]?.value ?? "",
          sessions: Number.parseFloat(metrics[0]?.value ?? "0") || 0,
          conversions: Number.parseFloat(metrics[1]?.value ?? "0") || 0,
          revenue: Number.parseFloat(metrics[2]?.value ?? "0") || 0,
          bounceRate: Number.parseFloat(metrics[3]?.value ?? "0") || 0,
        };
      });

      const totalSessions = channels.reduce((s, r) => s + r.sessions, 0);
      const totalConversions = channels.reduce((s, r) => s + r.conversions, 0);
      const totalRevenue = round2(channels.reduce((s, r) => s + r.revenue, 0));
      const overallBounceRate =
        channels.length > 0
          ? round2(channels.reduce((s, r) => s + r.bounceRate, 0) / channels.length)
          : 0;

      const topChannels = [...channels].sort((a, b) => b.sessions - a.sessions).slice(0, 10);

      return {
        topChannels,
        totalSessions,
        totalConversions,
        totalRevenue,
        overallBounceRate,
      };
    } catch (err: unknown) {
      this.logger.warn("analytics_fetch_error", {
        userId,
        error: err instanceof Error ? err.message : String(err),
      });
      return null;
    }
  }

  async getGoogleAdsData(
    userId: string,
    customerId: string,
    days: number = 30,
  ): Promise<GoogleAdsPerformanceData | null> {
    const headers = await this.getHeaders(userId);
    if (!headers) return null;

    const devToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN ?? "";
    const url = `${GOOGLE_ADS_BASE}/customers/${customerId}/googleAds:search`;
    const period = days <= 7 ? "LAST_7_DAYS" : days <= 14 ? "LAST_14_DAYS" : "LAST_30_DAYS";
    const gaql = `SELECT campaign.name, campaign.status, metrics.clicks, metrics.impressions, metrics.ctr, metrics.average_cpc, metrics.conversions, metrics.cost_micros FROM campaign WHERE segments.date DURING ${period} ORDER BY metrics.cost_micros DESC LIMIT 10`;

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          ...headers,
          "developer-token": devToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: gaql }),
      });
      if (!res.ok) {
        this.logger.warn("google_ads_data_fetch_failed", { userId, status: res.status });
        return null;
      }

      const json = (await res.json()) as {
        results?: Array<{
          campaign?: { name?: string; status?: string };
          metrics?: {
            clicks?: string;
            impressions?: string;
            ctr?: number;
            averageCpc?: string;
            conversions?: number;
            costMicros?: string;
          };
        }>;
      };

      const campaigns: GoogleAdsCampaignRow[] = (json.results ?? []).map((r) => {
        const costMicros = Number.parseInt(r.metrics?.costMicros ?? "0", 10) || 0;
        return {
          campaignName: r.campaign?.name ?? "",
          status: r.campaign?.status ?? "",
          clicks: Number.parseInt(r.metrics?.clicks ?? "0", 10) || 0,
          impressions: Number.parseInt(r.metrics?.impressions ?? "0", 10) || 0,
          ctr: round2((r.metrics?.ctr ?? 0) * 100),
          avgCpc: round2((Number.parseInt(r.metrics?.averageCpc ?? "0", 10) || 0) / 1_000_000),
          conversions: r.metrics?.conversions ?? 0,
          costEuros: round2(costMicros / 1_000_000),
        };
      });

      const totalSpend = round2(campaigns.reduce((s, c) => s + c.costEuros, 0));
      const totalConversions = campaigns.reduce((s, c) => s + c.conversions, 0);
      const avgRoas =
        totalSpend > 0
          ? round2(
              campaigns.reduce((s, c) => s + c.conversions * (c.costEuros > 0 ? 1 : 0), 0) /
                Math.max(totalSpend, 0.01),
            )
          : 0;

      return { campaigns, totalSpend, totalConversions, avgRoas };
    } catch (err: unknown) {
      this.logger.warn("google_ads_data_fetch_error", {
        userId,
        error: err instanceof Error ? err.message : String(err),
      });
      return null;
    }
  }
}
