import { createLogger } from "../../logger";
import { OAuthService } from "../../oauth/OAuthService";

const META_API_VERSION = "v19.0";
const BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`;

export interface MetaAdAccount {
  adAccountId: string;
  name: string;
  currency: string;
  status: number;
}

export interface MetaCampaignInput {
  name: string;
  objective?: string;
}

export interface MetaAdSetInput {
  name: string;
  campaignId: string;
  dailyBudgetCents: number;
  optimizationGoal?: string;
  ageMin?: number;
  ageMax?: number;
  countries?: string[];
}

export interface MetaAdCreativeInput {
  name: string;
  pageId: string;
  primaryText: string;
  headline: string;
  websiteUrl: string;
  description?: string;
  ctaType?: string;
}

export interface MetaAdInput {
  name: string;
  adSetId: string;
  creativeId: string;
}

let inst: MetaAdsExecutor | undefined;

export class MetaAdsExecutor {
  private readonly oauth = OAuthService.instance();
  private readonly logger = createLogger("meta_ads");

  static instance(): MetaAdsExecutor {
    if (!inst) inst = new MetaAdsExecutor();
    return inst;
  }

  static reset(): void {
    inst = undefined;
  }

  private async getAccessToken(userId: string): Promise<string> {
    const connection = await this.oauth.getConnection(userId, "meta");
    if (!connection) {
      throw new Error("Meta account not connected");
    }

    const expiresAt = connection.expiresAt;
    if (expiresAt && expiresAt < new Date(Date.now() + 24 * 60 * 60 * 1000)) {
      this.logger.warn("meta_token_expiring_soon", { userId });
    }

    return connection.accessToken;
  }

  async listAdAccounts(userId: string): Promise<MetaAdAccount[]> {
    const accessToken = await this.getAccessToken(userId);
    const params = new URLSearchParams({
      fields: "id,name,currency,account_status",
      access_token: accessToken,
    });
    const res = await fetch(`${BASE_URL}/me/adaccounts?${params.toString()}`);
    if (!res.ok) {
      throw new Error(`Meta ad accounts list failed: ${res.status}`);
    }
    const json = (await res.json()) as {
      data?: Array<{
        id?: string;
        name?: string;
        currency?: string;
        account_status?: number;
      }>;
    };
    return (json.data ?? []).map((item) => ({
      adAccountId: item.id ?? "",
      name: item.name ?? "",
      currency: item.currency ?? "",
      status: item.account_status ?? 0,
    }));
  }

  async createCampaign(
    userId: string,
    adAccountId: string,
    input: MetaCampaignInput,
  ): Promise<{ campaignId: string }> {
    const accessToken = await this.getAccessToken(userId);
    const body = new URLSearchParams({
      name: input.name,
      objective: input.objective ?? "OUTCOME_TRAFFIC",
      status: "PAUSED",
      special_ad_categories: "[]",
      access_token: accessToken,
    });
    const res = await fetch(`${BASE_URL}/${adAccountId}/campaigns`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!res.ok) {
      throw new Error(`Meta campaign create failed: ${res.status}`);
    }
    const json = (await res.json()) as { id?: string };
    if (!json.id) {
      throw new Error("Meta campaign create missing id");
    }
    this.logger.info("meta_campaign_created", { userId, adAccountId, campaignId: json.id });
    return { campaignId: json.id };
  }

  async createAdSet(
    userId: string,
    adAccountId: string,
    input: MetaAdSetInput,
  ): Promise<{ adSetId: string }> {
    const accessToken = await this.getAccessToken(userId);
    const targeting = {
      age_min: input.ageMin ?? 18,
      age_max: input.ageMax ?? 65,
      geo_locations: { countries: input.countries ?? ["ES"] },
      publisher_platforms: ["facebook", "instagram"],
    };
    const body = new URLSearchParams({
      name: input.name,
      campaign_id: input.campaignId,
      daily_budget: String(input.dailyBudgetCents),
      billing_event: "IMPRESSIONS",
      optimization_goal: input.optimizationGoal ?? "REACH",
      bid_strategy: "LOWEST_COST_WITHOUT_CAP",
      targeting: JSON.stringify(targeting),
      status: "PAUSED",
      access_token: accessToken,
    });
    const res = await fetch(`${BASE_URL}/${adAccountId}/adsets`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!res.ok) {
      throw new Error(`Meta ad set create failed: ${res.status}`);
    }
    const json = (await res.json()) as { id?: string };
    if (!json.id) {
      throw new Error("Meta ad set create missing id");
    }
    this.logger.info("meta_adset_created", { userId, adAccountId, adSetId: json.id });
    return { adSetId: json.id };
  }

  async createAdCreative(
    userId: string,
    adAccountId: string,
    input: MetaAdCreativeInput,
  ): Promise<{ creativeId: string }> {
    const accessToken = await this.getAccessToken(userId);
    const objectStorySpec = {
      page_id: input.pageId,
      link_data: {
        message: input.primaryText,
        link: input.websiteUrl,
        name: input.headline,
        description: input.description ?? "",
        call_to_action: {
          type: input.ctaType ?? "LEARN_MORE",
          value: { link: input.websiteUrl },
        },
      },
    };
    const body = new URLSearchParams({
      name: input.name,
      object_story_spec: JSON.stringify(objectStorySpec),
      access_token: accessToken,
    });
    const res = await fetch(`${BASE_URL}/${adAccountId}/adcreatives`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!res.ok) {
      throw new Error(`Meta ad creative create failed: ${res.status}`);
    }
    const json = (await res.json()) as { id?: string };
    if (!json.id) {
      throw new Error("Meta ad creative create missing id");
    }
    return { creativeId: json.id };
  }

  async createAd(
    userId: string,
    adAccountId: string,
    input: MetaAdInput,
  ): Promise<{ adId: string }> {
    const accessToken = await this.getAccessToken(userId);
    const body = new URLSearchParams({
      name: input.name,
      adset_id: input.adSetId,
      creative: JSON.stringify({ creative_id: input.creativeId }),
      status: "PAUSED",
      access_token: accessToken,
    });
    const res = await fetch(`${BASE_URL}/${adAccountId}/ads`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!res.ok) {
      throw new Error(`Meta ad create failed: ${res.status}`);
    }
    const json = (await res.json()) as { id?: string };
    if (!json.id) {
      throw new Error("Meta ad create missing id");
    }
    this.logger.info("meta_ad_created", { userId, adAccountId, adId: json.id });
    return { adId: json.id };
  }
}
