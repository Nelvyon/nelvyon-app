import type { DbClient } from "../db/DbClient";
import { DbClient as DbClientClass } from "../db/DbClient";
import { OsAgentError } from "../os-agents/OsAgentError";

const API_ROOT = "https://api.linkedin.com/v2";

export interface LinkedInAdsCredentials {
  userId: string;
  adAccountId: string;
  accessToken: string;
  refreshToken: string;
  tokenExpiry: string | null;
  isActive: boolean;
}

export interface LinkedInCampaign {
  id: string;
  name: string;
  status: string;
  type: string;
  totalBudget: number;
}

export interface LinkedInCampaignMetrics {
  campaignId: string;
  impressions: number;
  clicks: number;
  spend: number;
  leads: number;
  ctr: number;
  cpc: number;
}

export interface LinkedInAccountSummary {
  totalSpend: number;
  impressions: number;
  clicks: number;
  leads: number;
}

export interface LinkedInLeadForm {
  id: string;
  name: string;
}

export type LinkedInAdsServiceDeps = {
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

function last30DayRange(): { start: string; end: string } {
  const end = new Date();
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 29);
  return { start: formatYmdUTC(start), end: formatYmdUTC(end) };
}

function normalizeAccountId(adAccountId: string): string {
  return adAccountId.trim().replace(/^urn:li:sponsoredAccount:/, "");
}

function normalizeCampaignId(campaignId: string): string {
  return campaignId.trim().replace(/^urn:li:sponsoredCampaign:/, "");
}

function accountUrn(adAccountId: string): string {
  return `urn:li:sponsoredAccount:${normalizeAccountId(adAccountId)}`;
}

function campaignUrn(campaignId: string): string {
  const id = normalizeCampaignId(campaignId);
  return `urn:li:sponsoredCampaign:${id}`;
}

function restLiList(encodedUrn: string): string {
  return `List(${encodedUrn})`;
}

function dateRangeTuple(startIso: string, endIso: string): string {
  const [sy, sm, sd] = startIso.split("-").map((x) => Number.parseInt(x, 10));
  const [ey, em, ed] = endIso.split("-").map((x) => Number.parseInt(x, 10));
  return `(start:(day:${sd},month:${sm},year:${sy}),end:(day:${ed},month:${em},year:${ey}))`;
}

function idFromPivotOrField(raw: string | unknown): string {
  const s = String(raw ?? "");
  const m = s.match(/(\d+)\s*$/);
  return m?.[1] ?? s.replace(/^urn:li:sponsoredCampaign:/, "").replace(/^urn:li:sponsoredCreative:/, "");
}

type ElementsEnvelope = { elements?: ReadonlyArray<Record<string, unknown>> };

function coerceElements(body: unknown): Record<string, unknown>[] {
  if (typeof body !== "object" || body === null) return [];
  const els = (body as ElementsEnvelope).elements;
  return Array.isArray(els) ? [...els] : [];
}

function sumAnalytics(elements: Record<string, unknown>[]): {
  impressions: number;
  clicks: number;
  spend: number;
  leads: number;
} {
  let impressions = 0;
  let clicks = 0;
  let spend = 0;
  let leads = 0;
  for (const el of elements) {
    impressions += Math.round(toNum(el.impressions));
    clicks += Math.round(toNum(el.clicks));
    spend += toNum(el.costInUsd ?? el.costInLocalCurrency);
    leads += Math.round(
      toNum(
        el.oneClickLeads ??
          el.oneClickLeadFormOpens ??
          el.externalWebsiteConversions ??
          el.leads,
      ),
    );
  }
  return { impressions, clicks, spend, leads };
}

export class LinkedInAdsService {
  constructor(private readonly deps: LinkedInAdsServiceDeps = {}) {}

  private get db(): Pick<DbClient, "query"> {
    return this.deps.db ?? DbClientClass.getInstance();
  }

  private get fetchImpl(): typeof fetch {
    return this.deps.fetchFn ?? globalThis.fetch.bind(globalThis);
  }

  private headers(accessToken: string): Record<string, string> {
    return {
      Authorization: `Bearer ${accessToken}`,
      "X-Restli-Protocol-Version": "2.0.0",
    };
  }

  private async linkedInGet(pathAndQuery: string, accessToken: string): Promise<unknown> {
    const url = `${API_ROOT}${pathAndQuery}`;
    const res = await this.fetchImpl(url, { method: "GET", headers: this.headers(accessToken) });
    const text = await res.text();
    let body: unknown;
    try {
      body = JSON.parse(text) as unknown;
    } catch {
      throw new OsAgentError(`LinkedIn Ads returned non-JSON (HTTP ${res.status})`, "linkedin_http");
    }
    if (!res.ok) {
      const msg =
        typeof body === "object" && body !== null && "message" in body
          ? String((body as { message?: string }).message).slice(0, 400)
          : text.slice(0, 400);
      throw new OsAgentError(`LinkedIn Ads API error (HTTP ${res.status}): ${msg}`, "linkedin_api");
    }
    return body;
  }

  async saveCredentials(
    userId: string,
    adAccountId: string,
    accessToken: string,
    refreshToken: string,
    tokenExpiry: Date,
  ): Promise<void> {
    const aid = normalizeAccountId(adAccountId);
    if (!aid || !accessToken.trim() || !refreshToken.trim()) {
      throw new OsAgentError("adAccountId, accessToken y refreshToken son requeridos.", "linkedin_validation");
    }
    await this.db.query(
      `INSERT INTO integration_linkedin_ads
         (user_id, ad_account_id, access_token, refresh_token, token_expiry, is_active, updated_at)
       VALUES ($1::uuid, $2, $3, $4, $5::timestamptz, true, NOW())
       ON CONFLICT (user_id)
       DO UPDATE SET
         ad_account_id = EXCLUDED.ad_account_id,
         access_token = EXCLUDED.access_token,
         refresh_token = EXCLUDED.refresh_token,
         token_expiry = EXCLUDED.token_expiry,
         is_active = true,
         updated_at = NOW()`,
      [userId, aid, accessToken.trim(), refreshToken.trim(), tokenExpiry.toISOString()],
    );
  }

  async getCredentials(userId: string): Promise<LinkedInAdsCredentials | null> {
    const rows = await this.db.query<{
      user_id: string;
      ad_account_id: string | null;
      access_token: string | null;
      refresh_token: string | null;
      token_expiry: Date | string | null;
      is_active: boolean;
    }>(
      `SELECT user_id::text, ad_account_id, access_token, refresh_token, token_expiry, is_active
       FROM integration_linkedin_ads
       WHERE user_id = $1::uuid AND is_active = true
       LIMIT 1`,
      [userId],
    );
    const r = rows[0];
    if (!r || !r.access_token || !r.refresh_token || !r.ad_account_id) return null;
    return {
      userId: r.user_id,
      adAccountId: r.ad_account_id,
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

  private async requireCredentials(userId: string): Promise<LinkedInAdsCredentials> {
    const c = await this.getCredentials(userId);
    if (!c) {
      throw new OsAgentError("LinkedIn Ads is not connected for this user.", "linkedin_auth");
    }
    if (c.tokenExpiry) {
      const exp = new Date(c.tokenExpiry).getTime();
      if (Number.isFinite(exp) && Date.now() > exp - 60_000) {
        throw new OsAgentError("LinkedIn Ads access token expired. Reconnect OAuth.", "linkedin_auth");
      }
    }
    return c;
  }

  private campaignBudget(el: Record<string, unknown>): number {
    const total = el.totalBudget as Record<string, unknown> | undefined;
    const dailyNested = typeof el.dailyBudget === "object" && el.dailyBudget !== null ? (el.dailyBudget as Record<string, unknown>) : undefined;
    if (total && "amount" in total) return toNum(total.amount);
    if (dailyNested && "amount" in dailyNested) return toNum(dailyNested.amount);
    const raw = el.dailyBudget;
    if (raw !== undefined && typeof raw === "number") return toNum(raw);
    return 0;
  }

  async getCampaigns(userId: string): Promise<LinkedInCampaign[]> {
    const c = await this.requireCredentials(userId);
    const acct = encodeURIComponent(accountUrn(c.adAccountId));
    const q = `/adCampaignsV2?q=search&search.account.values[0]=${acct}`;
    const body = await this.linkedInGet(q, c.accessToken);
    const elements = coerceElements(body);
    return elements.map((el) => {
      const rid = el.id ?? el["campaignId"];
      let id = "";
      if (typeof rid === "number") id = String(Math.trunc(rid));
      else if (typeof rid === "string") id = rid.includes(":") ? idFromPivotOrField(rid) : rid.trim();
      return {
        id,
        name: String(el.name ?? el.localizedName ?? ""),
        status: String(el.status ?? ""),
        type: String((el.type as string) ?? (el.objectiveType as string) ?? ""),
        totalBudget: this.campaignBudget(el),
      };
    });
  }

  private analyticsQuery(params: {
    pivot: string;
    dateRangeEncoded: string;
    facet: string;
    facetListValue: string;
    fields: string;
  }): string {
    const dr = encodeURIComponent(params.dateRangeEncoded);
    const fieldsEnc = encodeURIComponent(params.fields);
    return `/adAnalyticsV2?q=analytics&pivot=${params.pivot}&timeGranularity=ALL&dateRange=${dr}&${params.facet}=${params.facetListValue}&fields=${fieldsEnc}`;
  }

  async getCampaignMetrics(
    userId: string,
    campaignId: string,
    dateRange: { start: string; end: string },
  ): Promise<LinkedInCampaignMetrics> {
    const c = await this.requireCredentials(userId);
    const dr = dateRangeTuple(dateRange.start.replace(/[^0-9-]/g, ""), dateRange.end.replace(/[^0-9-]/g, ""));
    const urn = encodeURIComponent(campaignUrn(campaignId));
    const path = this.analyticsQuery({
      pivot: "CAMPAIGN",
      dateRangeEncoded: dr,
      facet: "campaigns",
      facetListValue: restLiList(urn),
      fields: "impressions,clicks,costInUsd,oneClickLeads,pivotValues",
    });
    const body = await this.linkedInGet(path, c.accessToken);
    const elements = coerceElements(body);
    const { impressions, clicks, spend, leads } = sumAnalytics(elements);
    const ctr = impressions > 0 ? clicks / impressions : 0;
    const cpc = clicks > 0 ? spend / clicks : 0;
    return {
      campaignId: normalizeCampaignId(String(campaignId)),
      impressions,
      clicks,
      spend,
      leads,
      ctr,
      cpc,
    };
  }

  async getAccountSummary(userId: string): Promise<LinkedInAccountSummary> {
    const c = await this.requireCredentials(userId);
    const range = last30DayRange();
    const dr = dateRangeTuple(range.start, range.end);
    const urn = encodeURIComponent(accountUrn(c.adAccountId));
    const path = this.analyticsQuery({
      pivot: "ACCOUNT",
      dateRangeEncoded: dr,
      facet: "accounts",
      facetListValue: restLiList(urn),
      fields: "impressions,clicks,costInUsd,oneClickLeads,pivotValues",
    });
    const body = await this.linkedInGet(path, c.accessToken);
    const agg = sumAnalytics(coerceElements(body));
    return {
      totalSpend: agg.spend,
      impressions: agg.impressions,
      clicks: agg.clicks,
      leads: agg.leads,
    };
  }

  async getLeadGenForms(userId: string): Promise<LinkedInLeadForm[]> {
    const c = await this.requireCredentials(userId);
    const acct = encodeURIComponent(accountUrn(c.adAccountId));
    const q = `/leadGenForms?q=criteria&search.account.values[0]=${acct}`;
    const body = await this.linkedInGet(q, c.accessToken);
    const elements = coerceElements(body);
    return elements.map((el) => {
      const idRaw = el.id;
      let idStr = "";
      if (typeof idRaw === "number") idStr = String(idRaw);
      else if (typeof idRaw === "string") idStr = idFromPivotOrField(idRaw);
      else if (typeof idRaw === "object" && idRaw !== null && "entity" in idRaw) {
        idStr = String((idRaw as { entity?: string }).entity ?? "");
      }
      return {
        id: idStr || String(el.id ?? ""),
        name: String(el.name ?? el.localizedQuestionText ?? "Lead form"),
      };
    });
  }

  async revokeAccess(userId: string): Promise<void> {
    await this.db.query(
      `UPDATE integration_linkedin_ads SET is_active = false, updated_at = NOW() WHERE user_id = $1::uuid`,
      [userId],
    );
  }
}

let cachedLinkedInAds: LinkedInAdsService | undefined;

export function getLinkedInAdsService(): LinkedInAdsService {
  if (!cachedLinkedInAds) cachedLinkedInAds = new LinkedInAdsService();
  return cachedLinkedInAds;
}

export function resetLinkedInAdsServiceForTests(): void {
  cachedLinkedInAds = undefined;
}
