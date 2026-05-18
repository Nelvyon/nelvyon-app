import type { DbClient } from "../db/DbClient";
import { DbClient as DbClientClass } from "../db/DbClient";
import { OsAgentError } from "../os-agents/OsAgentError";

const DATA_API_BASE = "https://analyticsdata.googleapis.com/v1beta";

export interface GA4Credentials {
  userId: string;
  propertyId: string;
  accessToken: string;
  refreshToken: string;
  tokenExpiry: string | null;
  isActive: boolean;
}

export interface GA4ReportRow {
  dimensions: Record<string, string>;
  metrics: Record<string, string>;
}

export interface GA4SessionsSummary {
  sessions: number;
  activeUsers: number;
  newUsers: number;
  bounceRate: number;
  avgSessionDuration: number;
}

export interface GA4PageRow {
  pagePath: string;
  screenPageViews: number;
  avgTimeOnPage: number;
}

export interface GA4ConversionRow {
  eventName: string;
  eventCount: number;
}

export interface GA4TrafficSource {
  channel: string;
  sessions: number;
  conversions: number;
}

export type GoogleAnalytics4ServiceDeps = {
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

function normalizePropertyId(propertyId: string): string {
  return propertyId.trim().replace(/^properties\//, "");
}

type RunReportApiResponse = {
  dimensionHeaders?: ReadonlyArray<{ name?: string }>;
  metricHeaders?: ReadonlyArray<{ name?: string }>;
  rows?: ReadonlyArray<{
    dimensionValues?: ReadonlyArray<{ value?: string }>;
    metricValues?: ReadonlyArray<{ value?: string }>;
  }>;
  error?: { message?: string; code?: number; status?: string };
};

export function parseRunReportResponse(data: RunReportApiResponse): GA4ReportRow[] {
  const dimNames = (data.dimensionHeaders ?? []).map((h) => h.name ?? "");
  const metNames = (data.metricHeaders ?? []).map((h) => h.name ?? "");
  const out: GA4ReportRow[] = [];
  for (const row of data.rows ?? []) {
    const dimensions: Record<string, string> = {};
    const metrics: Record<string, string> = {};
    (row.dimensionValues ?? []).forEach((v, i) => {
      const k = dimNames[i];
      if (k) dimensions[k] = v.value ?? "";
    });
    (row.metricValues ?? []).forEach((v, i) => {
      const k = metNames[i];
      if (k) metrics[k] = v.value ?? "";
    });
    out.push({ dimensions, metrics });
  }
  return out;
}

export class GoogleAnalytics4Service {
  constructor(private readonly deps: GoogleAnalytics4ServiceDeps = {}) {}

  private get db(): Pick<DbClient, "query"> {
    return this.deps.db ?? DbClientClass.getInstance();
  }

  private get fetchImpl(): typeof fetch {
    return this.deps.fetchFn ?? globalThis.fetch.bind(globalThis);
  }

  private reportEndpoint(propertyId: string): string {
    const id = normalizePropertyId(propertyId);
    if (!id) {
      throw new OsAgentError("propertyId is required.", "ga4_validation");
    }
    return `${DATA_API_BASE}/properties/${encodeURIComponent(id)}:runReport`;
  }

  async saveCredentials(
    userId: string,
    propertyId: string,
    accessToken: string,
    refreshToken: string,
    tokenExpiry: Date,
  ): Promise<void> {
    const pid = normalizePropertyId(propertyId);
    if (!pid || !accessToken.trim() || !refreshToken.trim()) {
      throw new OsAgentError("propertyId, accessToken y refreshToken son requeridos.", "ga4_validation");
    }
    await this.db.query(
      `INSERT INTO integration_ga4
         (user_id, property_id, access_token, refresh_token, token_expiry, is_active, updated_at)
       VALUES ($1::uuid, $2, $3, $4, $5::timestamptz, true, NOW())
       ON CONFLICT (user_id)
       DO UPDATE SET
         property_id = EXCLUDED.property_id,
         access_token = EXCLUDED.access_token,
         refresh_token = EXCLUDED.refresh_token,
         token_expiry = EXCLUDED.token_expiry,
         is_active = true,
         updated_at = NOW()`,
      [userId, pid, accessToken.trim(), refreshToken.trim(), tokenExpiry.toISOString()],
    );
  }

  async getCredentials(userId: string): Promise<GA4Credentials | null> {
    const rows = await this.db.query<{
      user_id: string;
      property_id: string | null;
      access_token: string | null;
      refresh_token: string | null;
      token_expiry: Date | string | null;
      is_active: boolean;
    }>(
      `SELECT user_id::text, property_id, access_token, refresh_token, token_expiry, is_active
       FROM integration_ga4
       WHERE user_id = $1::uuid AND is_active = true
       LIMIT 1`,
      [userId],
    );
    const r = rows[0];
    if (!r || !r.access_token || !r.refresh_token || !r.property_id) return null;
    return {
      userId: r.user_id,
      propertyId: r.property_id,
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

  private async requireCredentials(userId: string): Promise<GA4Credentials> {
    const c = await this.getCredentials(userId);
    if (!c) {
      throw new OsAgentError("Google Analytics 4 is not connected for this user.", "ga4_auth");
    }
    if (c.tokenExpiry) {
      const exp = new Date(c.tokenExpiry).getTime();
      if (Number.isFinite(exp) && Date.now() > exp - 60_000) {
        throw new OsAgentError("GA4 access token expired. Reconnect OAuth.", "ga4_auth");
      }
    }
    return c;
  }

  async runReport(
    userId: string,
    dateRange: { startDate: string; endDate: string },
    dimensions: string[],
    metrics: string[],
    extraBody?: Record<string, unknown>,
  ): Promise<GA4ReportRow[]> {
    const c = await this.requireCredentials(userId);
    const body: Record<string, unknown> = {
      dateRanges: [{ startDate: dateRange.startDate, endDate: dateRange.endDate }],
      dimensions: dimensions.map((name) => ({ name })),
      metrics: metrics.map((name) => ({ name })),
      ...(extraBody ?? {}),
    };
    const url = this.reportEndpoint(c.propertyId);
    const res = await this.fetchImpl(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${c.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    let parsed: RunReportApiResponse;
    try {
      parsed = JSON.parse(text) as RunReportApiResponse;
    } catch {
      throw new OsAgentError(`GA4 Data API returned non-JSON (HTTP ${res.status})`, "ga4_http");
    }
    if (!res.ok || parsed.error != null) {
      const msg = parsed.error?.message ?? text.slice(0, 400);
      throw new OsAgentError(`GA4 Data API error (HTTP ${res.status}): ${msg}`, "ga4_api");
    }
    return parseRunReportResponse(parsed);
  }

  async getSessionsSummary(userId: string, dateRange: { startDate: string; endDate: string }): Promise<GA4SessionsSummary> {
    const rows = await this.runReport(
      userId,
      dateRange,
      [],
      ["sessions", "activeUsers", "newUsers", "bounceRate", "averageSessionDuration"],
    );
    const m = rows[0]?.metrics ?? {};
    return {
      sessions: Math.round(toNum(m.sessions)),
      activeUsers: Math.round(toNum(m.activeUsers)),
      newUsers: Math.round(toNum(m.newUsers)),
      bounceRate: toNum(m.bounceRate),
      avgSessionDuration: toNum(m.averageSessionDuration),
    };
  }

  async getTopPages(userId: string, limit = 10): Promise<GA4PageRow[]> {
    const range = last28DayRange();
    const capped = Math.max(1, Math.min(limit, 250));
    const rows = await this.runReport(userId, range, ["pagePath"], ["screenPageViews", "averageSessionDuration"], {
      orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
      limit: capped,
    });
    return rows.map((r) => ({
      pagePath: r.dimensions.pagePath ?? "",
      screenPageViews: Math.round(toNum(r.metrics.screenPageViews)),
      avgTimeOnPage: toNum(r.metrics.averageSessionDuration),
    }));
  }

  async getConversions(userId: string, dateRange: { startDate: string; endDate: string }): Promise<GA4ConversionRow[]> {
    const rows = await this.runReport(userId, dateRange, ["eventName"], ["eventCount"], {
      dimensionFilter: {
        filter: {
          fieldName: "isConversionEvent",
          stringFilter: {
            matchType: "EXACT",
            value: "true",
          },
        },
      },
    });
    return rows.map((r) => ({
      eventName: r.dimensions.eventName ?? "",
      eventCount: Math.round(toNum(r.metrics.eventCount)),
    }));
  }

  async getTrafficSources(userId: string, dateRange: { startDate: string; endDate: string }): Promise<GA4TrafficSource[]> {
    const rows = await this.runReport(
      userId,
      dateRange,
      ["sessionDefaultChannelGroup"],
      ["sessions", "conversions"],
    );
    return rows.map((r) => ({
      channel: r.dimensions.sessionDefaultChannelGroup ?? "",
      sessions: Math.round(toNum(r.metrics.sessions)),
      conversions: Math.round(toNum(r.metrics.conversions)),
    }));
  }

  async revokeAccess(userId: string): Promise<void> {
    await this.db.query(`UPDATE integration_ga4 SET is_active = false, updated_at = NOW() WHERE user_id = $1::uuid`, [
      userId,
    ]);
  }
}

let cachedGA4: GoogleAnalytics4Service | undefined;

export function getGA4Service(): GoogleAnalytics4Service {
  if (!cachedGA4) cachedGA4 = new GoogleAnalytics4Service();
  return cachedGA4;
}

export function resetGA4ServiceForTests(): void {
  cachedGA4 = undefined;
}
