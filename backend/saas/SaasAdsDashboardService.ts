/**
 * SaasAdsDashboardService — fetch real ad metrics from Meta Ads & Google Ads.
 * Tenant-scoped (saas_ads_connections). Caches results in saas_ads_metrics_cache.
 * If no connection → { connected: false }. Never returns fake data.
 */
import { DbClient } from "../db/DbClient";

export type AdsPlatform = "meta" | "google" | "linkedin" | "tiktok";

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

export type AdsStatusResult = {
  platform: AdsPlatform;
  connected: boolean;
  accountName?: string;
  tokenExpired?: boolean;
};

export class SaasAdsDashboardError extends Error {
  constructor(message: string, public readonly code: "NOT_FOUND" | "NOT_CONNECTED" | "VALIDATION" | "API_ERROR") {
    super(message);
    this.name = "SaasAdsDashboardError";
  }
}

const PLATFORMS: AdsPlatform[] = ["meta", "google", "linkedin", "tiktok"];
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
    const conns = await this.db.query<ConnectionRow>(
      `SELECT * FROM saas_ads_connections WHERE tenant_id=$1 AND platform=$2 AND is_active=true ORDER BY created_at DESC LIMIT 1`,
      [tenantId, platform],
    );
    if (!conns.length) throw new SaasAdsDashboardError(`No active ${platform} connection for this tenant`, "NOT_CONNECTED");
    const conn = conns[0];

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
    } else {
      // linkedin / tiktok — endpoint not yet implemented
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
}

let _instance: SaasAdsDashboardService | null = null;
export function getSaasAdsDashboardService(): SaasAdsDashboardService {
  if (!_instance) _instance = new SaasAdsDashboardService(DbClient.getInstance());
  return _instance;
}
export function resetSaasAdsDashboardServiceForTests(): void { _instance = null; }
