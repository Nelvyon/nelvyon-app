import { randomUUID } from "node:crypto";

import type { DbClient } from "../db/DbClient";
import { DbClient as DbClientClass } from "../db/DbClient";
import { OsAgentError } from "../os-agents/OsAgentError";

const META_API_VERSION = "v19.0";
const GRAPH_BASE = `https://graph.facebook.com/${META_API_VERSION}`;

export interface MetaAdsCredentials {
  userId: string;
  adAccountId: string;
  accessToken: string;
  pixelId: string;
  isActive: boolean;
}

export interface MetaAdsCampaign {
  id: string;
  name: string;
  status: string;
  objective: string;
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
}

export interface MetaAdsCampaignMetrics {
  campaignId: string;
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
}

export interface ConversionEvent {
  eventName: string;
  eventTime: number;
  userData: Record<string, string>;
  customData: Record<string, unknown>;
}

export interface MetaAdsAccountSummary {
  totalSpend: number;
  impressions: number;
  clicks: number;
  cpm: number;
  ctr: number;
}

export type MetaAdsServiceDeps = {
  db?: Pick<DbClient, "query">;
  fetchFn?: typeof fetch;
};

function toNum(v: string | number | undefined | null): number {
  if (v === undefined || v === null) return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const n = Number.parseFloat(String(v));
  return Number.isFinite(n) ? n : 0;
}

function normalizeActId(adAccountId: string): string {
  const trimmed = adAccountId.trim();
  if (trimmed.startsWith("act_")) return trimmed;
  return `act_${trimmed}`;
}

function extractAccountIdForStorage(adAccountId: string): string {
  const t = adAccountId.trim();
  return t.startsWith("act_") ? t.slice(4) : t;
}

type GraphListResponse<T> = { data?: T[]; error?: { message?: string } };
type InsightsData = {
  impressions?: string;
  clicks?: string;
  spend?: string;
  conversions?: string;
  actions?: ReadonlyArray<{ action_type?: string; value?: string }>;
};

function conversionsFromInsight(ins: InsightsData | undefined): number {
  if (!ins) return 0;
  const direct = toNum(ins.conversions);
  if (direct > 0) return direct;
  const actions = ins.actions;
  if (!Array.isArray(actions)) return 0;
  let sum = 0;
  for (const a of actions) {
    const at = (a.action_type ?? "").toLowerCase();
    if (
      at.includes("purchase") ||
      at.includes("lead") ||
      at.includes("complete_registration") ||
      at.includes("offsite_conversion") ||
      at === "omni_purchase"
    ) {
      sum += toNum(a.value);
    }
  }
  return sum;
}

export class MetaAdsService {
  constructor(private readonly deps: MetaAdsServiceDeps = {}) {}

  private get db(): Pick<DbClient, "query"> {
    return this.deps.db ?? DbClientClass.getInstance();
  }

  private get fetchImpl(): typeof fetch {
    return this.deps.fetchFn ?? globalThis.fetch.bind(globalThis);
  }

  private accessQuery(accessToken: string): string {
    return `access_token=${encodeURIComponent(accessToken)}`;
  }

  async saveCredentials(userId: string, adAccountId: string, accessToken: string, pixelId: string): Promise<void> {
    const storedAct = extractAccountIdForStorage(adAccountId);
    await this.db.query(
      `INSERT INTO integration_meta_ads
         (user_id, ad_account_id, access_token, pixel_id, is_active, updated_at)
       VALUES ($1::uuid, $2, $3, $4, true, NOW())
       ON CONFLICT (user_id)
       DO UPDATE SET
         ad_account_id = EXCLUDED.ad_account_id,
         access_token = EXCLUDED.access_token,
         pixel_id = EXCLUDED.pixel_id,
         is_active = true,
         updated_at = NOW()`,
      [userId, storedAct, accessToken, pixelId],
    );
  }

  async getCredentials(userId: string): Promise<MetaAdsCredentials | null> {
    const rows = await this.db.query<{
      user_id: string;
      ad_account_id: string | null;
      access_token: string | null;
      pixel_id: string | null;
      is_active: boolean;
    }>(
      `SELECT user_id::text, ad_account_id, access_token, pixel_id, is_active
       FROM integration_meta_ads
       WHERE user_id = $1::uuid AND is_active = true
       LIMIT 1`,
      [userId],
    );
    const r = rows[0];
    if (!r || !r.access_token || !r.ad_account_id || !r.pixel_id) return null;
    return {
      userId: r.user_id,
      adAccountId: r.ad_account_id,
      accessToken: r.access_token,
      pixelId: r.pixel_id,
      isActive: r.is_active,
    };
  }

  private async requireCredentials(userId: string): Promise<MetaAdsCredentials> {
    const c = await this.getCredentials(userId);
    if (!c) {
      throw new OsAgentError("Meta Ads is not connected for this user.", "meta_ads_auth");
    }
    return c;
  }

  private async graphGet<T>(path: string, accessToken: string): Promise<T> {
    const url = `${GRAPH_BASE}${path}${path.includes("?") ? "&" : "?"}${this.accessQuery(accessToken)}`;
    const res = await this.fetchImpl(url, { method: "GET" });
    const text = await res.text();
    let body: unknown;
    try {
      body = JSON.parse(text) as unknown;
    } catch {
      throw new OsAgentError(`Meta Graph returned non-JSON (HTTP ${res.status})`, "meta_ads_http");
    }
    if (!res.ok || (typeof body === "object" && body !== null && "error" in body)) {
      const msg =
        typeof body === "object" && body !== null && "error" in body
          ? JSON.stringify((body as { error?: { message?: string } }).error).slice(0, 400)
          : text.slice(0, 400);
      throw new OsAgentError(`Meta Graph API error (HTTP ${res.status}): ${msg}`, "meta_ads_api");
    }
    return body as T;
  }

  private async graphPost(path: string, accessToken: string, jsonBody: Record<string, unknown>): Promise<Record<string, unknown>> {
    const url = `${GRAPH_BASE}${path}?${this.accessQuery(accessToken)}`;
    const res = await this.fetchImpl(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(jsonBody),
    });
    const text = await res.text();
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(text) as Record<string, unknown>;
    } catch {
      throw new OsAgentError(`Meta Graph POST non-JSON (HTTP ${res.status})`, "meta_ads_http");
    }
    if (!res.ok || ("error" in body && body.error != null)) {
      throw new OsAgentError(
        `Meta Graph API error (HTTP ${res.status}): ${JSON.stringify(body.error ?? body).slice(0, 400)}`,
        "meta_ads_api",
      );
    }
    return body;
  }

  async getCampaigns(userId: string): Promise<MetaAdsCampaign[]> {
    const c = await this.requireCredentials(userId);
    const act = normalizeActId(c.adAccountId);
    const fields =
      "id,name,status,objective,insights.date_preset(last_30d){impressions,clicks,spend,conversions,actions}";
    const path = `/${encodeURIComponent(act)}/campaigns?fields=${encodeURIComponent(fields)}`;
    const out = await this.graphGet<GraphListResponse<Record<string, unknown>>>(path, c.accessToken);
    const list = out.data ?? [];
    return list.map((row) => {
      const insData = row.insights as { data?: InsightsData[] } | undefined;
      const ins = Array.isArray(insData?.data) ? insData.data[0] : undefined;
      return {
        id: String(row.id ?? ""),
        name: String(row.name ?? ""),
        status: String(row.status ?? ""),
        objective: String(row.objective ?? ""),
        impressions: toNum(ins?.impressions),
        clicks: toNum(ins?.clicks),
        spend: toNum(ins?.spend),
        conversions: conversionsFromInsight(ins),
      };
    });
  }

  async getCampaignMetrics(userId: string, campaignId: string, dateRange: { since: string; until: string }): Promise<MetaAdsCampaignMetrics> {
    if (!/^\d+$/.test(campaignId)) {
      throw new OsAgentError("campaignId must be numeric", "meta_ads_validation");
    }
    const since = dateRange.since.replace(/[^0-9-]/g, "");
    const until = dateRange.until.replace(/[^0-9-]/g, "");
    const c = await this.requireCredentials(userId);
    const fields = encodeURIComponent("impressions,clicks,spend,conversions,actions");
    const range = encodeURIComponent(JSON.stringify({ since, until }));
    const path = `/${campaignId}/insights?fields=${fields}&time_range=${range}&level=campaign`;
    const out = await this.graphGet<GraphListResponse<InsightsData>>(path, c.accessToken);
    let impressions = 0;
    let clicks = 0;
    let spend = 0;
    let conversions = 0;
    for (const row of out.data ?? []) {
      impressions += toNum(row.impressions);
      clicks += toNum(row.clicks);
      spend += toNum(row.spend);
      conversions += conversionsFromInsight(row);
    }
    return { campaignId, impressions, clicks, spend, conversions };
  }

  async sendConversionEvent(userId: string, event: ConversionEvent): Promise<{ eventId: string }> {
    const c = await this.requireCredentials(userId);
    const eventId = randomUUID();
    const payload = {
      data: [
        {
          event_name: event.eventName,
          event_time: Math.floor(event.eventTime),
          user_data: event.userData,
          custom_data: event.customData,
          action_source: "website",
          event_id: eventId,
        },
      ],
    };
    await this.graphPost(`/${encodeURIComponent(c.pixelId)}/events`, c.accessToken, payload);
    return { eventId };
  }

  async getAccountSummary(userId: string): Promise<MetaAdsAccountSummary> {
    const c = await this.requireCredentials(userId);
    const act = normalizeActId(c.adAccountId);
    const fields = encodeURIComponent("impressions,clicks,spend");
    const path = `/${encodeURIComponent(act)}/insights?fields=${fields}&date_preset=last_30d`;
    const out = await this.graphGet<GraphListResponse<InsightsData>>(path, c.accessToken);
    let impressions = 0;
    let clicks = 0;
    let spend = 0;
    for (const row of out.data ?? []) {
      impressions += toNum(row.impressions);
      clicks += toNum(row.clicks);
      spend += toNum(row.spend);
    }
    const ctr = impressions > 0 ? clicks / impressions : 0;
    const cpm = impressions > 0 ? (spend / impressions) * 1000 : 0;
    return {
      totalSpend: spend,
      impressions,
      clicks,
      cpm,
      ctr,
    };
  }

  async revokeAccess(userId: string): Promise<void> {
    await this.db.query(`UPDATE integration_meta_ads SET is_active = false, updated_at = NOW() WHERE user_id = $1::uuid`, [userId]);
  }
}

let cachedMetaAds: MetaAdsService | undefined;

export function getMetaAdsService(): MetaAdsService {
  if (!cachedMetaAds) cachedMetaAds = new MetaAdsService();
  return cachedMetaAds;
}

export function resetMetaAdsServiceForTests(): void {
  cachedMetaAds = undefined;
}
