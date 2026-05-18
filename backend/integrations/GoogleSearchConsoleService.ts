import type { DbClient } from "../db/DbClient";
import { DbClient as DbClientClass } from "../db/DbClient";
import { OsAgentError } from "../os-agents/OsAgentError";

const API_BASE = "https://searchconsole.googleapis.com/webmasters/v3/sites";

export interface SearchConsoleCredentials {
  userId: string;
  siteUrl: string;
  accessToken: string;
  refreshToken: string;
  tokenExpiry: string | null;
  isActive: boolean;
}

export interface SearchAnalyticsRow {
  query: string;
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface SearchKeyword {
  keyword: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface SearchPage {
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface SearchConsoleSummary {
  totalClicks: number;
  totalImpressions: number;
  averageCtr: number;
  averagePosition: number;
}

export type GoogleSearchConsoleServiceDeps = {
  db?: Pick<DbClient, "query">;
  fetchFn?: typeof fetch;
};

function toNum(v: string | number | undefined | null): number {
  if (v === undefined || v === null) return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const n = Number.parseFloat(String(v));
  return Number.isFinite(n) ? n : 0;
}

function formatYmdUTC(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function last28DayRange(): { startDate: string; endDate: string } {
  const end = new Date();
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 27);
  return { startDate: formatYmdUTC(start), endDate: formatYmdUTC(end) };
}

type SearchAnalyticsApiRow = {
  keys?: string[];
  clicks?: number;
  impressions?: number;
  ctr?: number;
  position?: number;
};

type SearchAnalyticsResponse = {
  rows?: SearchAnalyticsApiRow[];
  error?: { message?: string; code?: number };
};

function mapRowToAnalytics(row: SearchAnalyticsApiRow, dimensions: string[]): SearchAnalyticsRow {
  const keys = row.keys ?? [];
  let query = "";
  let page = "";
  for (let i = 0; i < dimensions.length; i++) {
    const dim = dimensions[i];
    const val = keys[i] ?? "";
    if (dim === "query") query = val;
    else if (dim === "page") page = val;
  }
  return {
    query,
    page,
    clicks: Math.round(toNum(row.clicks)),
    impressions: Math.round(toNum(row.impressions)),
    ctr: toNum(row.ctr),
    position: toNum(row.position),
  };
}

export class GoogleSearchConsoleService {
  constructor(private readonly deps: GoogleSearchConsoleServiceDeps = {}) {}

  private get db(): Pick<DbClient, "query"> {
    return this.deps.db ?? DbClientClass.getInstance();
  }

  private get fetchImpl(): typeof fetch {
    return this.deps.fetchFn ?? globalThis.fetch.bind(globalThis);
  }

  async saveCredentials(
    userId: string,
    siteUrl: string,
    accessToken: string,
    refreshToken: string,
    tokenExpiry: Date,
  ): Promise<void> {
    const site = siteUrl.trim();
    if (!site) {
      throw new OsAgentError("siteUrl is required.", "search_console_validation");
    }
    await this.db.query(
      `INSERT INTO integration_search_console
         (user_id, site_url, access_token, refresh_token, token_expiry, is_active, updated_at)
       VALUES ($1::uuid, $2, $3, $4, $5::timestamptz, true, NOW())
       ON CONFLICT (user_id)
       DO UPDATE SET
         site_url = EXCLUDED.site_url,
         access_token = EXCLUDED.access_token,
         refresh_token = EXCLUDED.refresh_token,
         token_expiry = EXCLUDED.token_expiry,
         is_active = true,
         updated_at = NOW()`,
      [userId, site, accessToken, refreshToken, tokenExpiry.toISOString()],
    );
  }

  async getCredentials(userId: string): Promise<SearchConsoleCredentials | null> {
    const rows = await this.db.query<{
      user_id: string;
      site_url: string | null;
      access_token: string | null;
      refresh_token: string | null;
      token_expiry: Date | string | null;
      is_active: boolean;
    }>(
      `SELECT user_id::text, site_url, access_token, refresh_token, token_expiry, is_active
       FROM integration_search_console
       WHERE user_id = $1::uuid AND is_active = true
       LIMIT 1`,
      [userId],
    );
    const r = rows[0];
    if (!r || !r.access_token || !r.refresh_token || !r.site_url) return null;
    return {
      userId: r.user_id,
      siteUrl: r.site_url,
      accessToken: r.access_token,
      refreshToken: r.refresh_token,
      tokenExpiry: r.token_expiry
        ? typeof r.token_expiry === "string"
          ? r.token_expiry
          : r.token_expiry.toISOString()
        : null,
      isActive: r.is_active,
    };
  }

  private async requireCredentials(userId: string): Promise<SearchConsoleCredentials> {
    const c = await this.getCredentials(userId);
    if (!c) {
      throw new OsAgentError("Search Console is not connected for this user.", "search_console_auth");
    }
    if (c.tokenExpiry) {
      const exp = new Date(c.tokenExpiry).getTime();
      if (Number.isFinite(exp) && Date.now() > exp - 60_000) {
        throw new OsAgentError("Search Console access token expired. Reconnect OAuth.", "search_console_auth");
      }
    }
    return c;
  }

  private analyticsUrl(siteUrl: string): string {
    return `${API_BASE}/${encodeURIComponent(siteUrl.trim())}/searchAnalytics/query`;
  }

  private async postSearchAnalytics(
    siteUrl: string,
    accessToken: string,
    body: Record<string, unknown>,
  ): Promise<SearchAnalyticsResponse> {
    const url = this.analyticsUrl(siteUrl);
    const res = await this.fetchImpl(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    let parsed: SearchAnalyticsResponse;
    try {
      parsed = JSON.parse(text) as SearchAnalyticsResponse;
    } catch {
      throw new OsAgentError(`Search Console returned non-JSON (HTTP ${res.status})`, "search_console_http");
    }
    if (!res.ok) {
      const errMsg =
        parsed.error?.message ?? (typeof text === "string" ? text.slice(0, 400) : "unknown");
      throw new OsAgentError(`Search Console API error (HTTP ${res.status}): ${errMsg}`, "search_console_api");
    }
    return parsed;
  }

  async getSearchAnalytics(
    userId: string,
    dateRange: { startDate: string; endDate: string },
    dimensions: string[] = ["query", "page"],
  ): Promise<SearchAnalyticsRow[]> {
    const creds = await this.requireCredentials(userId);
    const body: Record<string, unknown> = {
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      dimensions,
      rowLimit: 25000,
    };
    const data = await this.postSearchAnalytics(creds.siteUrl, creds.accessToken, body);
    const rows = data.rows ?? [];
    return rows.map((row) => mapRowToAnalytics(row, dimensions));
  }

  async getTopKeywords(userId: string, limit = 10): Promise<SearchKeyword[]> {
    const creds = await this.requireCredentials(userId);
    const range = last28DayRange();
    const body: Record<string, unknown> = {
      startDate: range.startDate,
      endDate: range.endDate,
      dimensions: ["query"],
      rowLimit: 25000,
    };
    const data = await this.postSearchAnalytics(creds.siteUrl, creds.accessToken, body);
    const rows = data.rows ?? [];
    const mapped: SearchKeyword[] = rows.map((row) => {
      const m = mapRowToAnalytics(row, ["query"]);
      return {
        keyword: m.query,
        clicks: m.clicks,
        impressions: m.impressions,
        ctr: m.ctr,
        position: m.position,
      };
    });
    mapped.sort((a, b) => b.clicks - a.clicks);
    return mapped.slice(0, Math.max(0, Math.min(limit, 25000)));
  }

  async getTopPages(userId: string, limit = 10): Promise<SearchPage[]> {
    const creds = await this.requireCredentials(userId);
    const range = last28DayRange();
    const body: Record<string, unknown> = {
      startDate: range.startDate,
      endDate: range.endDate,
      dimensions: ["page"],
      rowLimit: 25000,
    };
    const data = await this.postSearchAnalytics(creds.siteUrl, creds.accessToken, body);
    const rows = data.rows ?? [];
    const mapped: SearchPage[] = rows.map((row) => {
      const m = mapRowToAnalytics(row, ["page"]);
      return {
        page: m.page,
        clicks: m.clicks,
        impressions: m.impressions,
        ctr: m.ctr,
        position: m.position,
      };
    });
    mapped.sort((a, b) => b.impressions - a.impressions);
    return mapped.slice(0, Math.max(0, Math.min(limit, 25000)));
  }

  async getSummary(userId: string): Promise<SearchConsoleSummary> {
    const creds = await this.requireCredentials(userId);
    const range = last28DayRange();
    const body: Record<string, unknown> = {
      startDate: range.startDate,
      endDate: range.endDate,
      rowLimit: 1,
    };
    const data = await this.postSearchAnalytics(creds.siteUrl, creds.accessToken, body);
    const rows = data.rows ?? [];
    if (rows.length === 0) {
      return { totalClicks: 0, totalImpressions: 0, averageCtr: 0, averagePosition: 0 };
    }
    let totalClicks = 0;
    let totalImpressions = 0;
    let weightedPos = 0;
    for (const row of rows) {
      const clicks = Math.round(toNum(row.clicks));
      const impressions = Math.round(toNum(row.impressions));
      const pos = toNum(row.position);
      totalClicks += clicks;
      totalImpressions += impressions;
      weightedPos += pos * impressions;
    }
    const averageCtr = totalImpressions > 0 ? totalClicks / totalImpressions : 0;
    const averagePosition = totalImpressions > 0 ? weightedPos / totalImpressions : 0;
    return { totalClicks, totalImpressions, averageCtr, averagePosition };
  }

  async revokeAccess(userId: string): Promise<void> {
    await this.db.query(
      `UPDATE integration_search_console SET is_active = false, updated_at = NOW() WHERE user_id = $1::uuid`,
      [userId],
    );
  }
}

let cachedSearchConsole: GoogleSearchConsoleService | undefined;

export function getSearchConsoleService(): GoogleSearchConsoleService {
  if (!cachedSearchConsole) cachedSearchConsole = new GoogleSearchConsoleService();
  return cachedSearchConsole;
}

export function resetSearchConsoleServiceForTests(): void {
  cachedSearchConsole = undefined;
}
