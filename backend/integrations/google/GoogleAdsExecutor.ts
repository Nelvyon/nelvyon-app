import { createLogger } from "../../logger";
import { GoogleOAuthProvider } from "../../oauth/GoogleOAuthProvider";
import { OAuthService } from "../../oauth/OAuthService";

const GOOGLE_ADS_API_VERSION = "v17";
const BASE_URL = `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}`;

function googleAdsDeveloperToken(): string {
  return process.env.GOOGLE_ADS_DEVELOPER_TOKEN ?? "";
}

export interface GoogleAdsAccount {
  customerId: string;
  name: string;
  currencyCode: string;
  timeZone: string;
}

export interface GoogleAdsCampaignInput {
  name: string;
  channelType?: string;
  budgetResourceName: string;
}

export interface GoogleAdsAdGroupInput {
  name: string;
  campaignResourceName: string;
  cpcBidMicros?: number;
}

export interface GoogleAdsRSAInput {
  adGroupResourceName: string;
  headlines: string[];
  descriptions: string[];
  finalUrl: string;
}

function parseResourceSegment(resourceName: string, segment: string): string {
  const parts = resourceName.split("/");
  const idx = parts.indexOf(segment);
  if (idx >= 0 && parts[idx + 1]) return parts[idx + 1]!;
  return "";
}

let inst: GoogleAdsExecutor | undefined;

export class GoogleAdsExecutor {
  private readonly oauth = OAuthService.instance();
  private readonly logger = createLogger("google_ads");

  static instance(): GoogleAdsExecutor {
    if (!inst) inst = new GoogleAdsExecutor();
    return inst;
  }

  static reset(): void {
    inst = undefined;
  }

  private async getHeaders(userId: string): Promise<Record<string, string>> {
    const connection = await this.oauth.getConnection(userId, "google");
    if (!connection) {
      throw new Error("Google account not connected");
    }

    let accessToken = connection.accessToken;
    const expiresAt = connection.expiresAt;
    if (expiresAt && expiresAt < new Date()) {
      if (!connection.refreshToken) {
        throw new Error("Google account not connected");
      }
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
    }

    return {
      Authorization: `Bearer ${accessToken}`,
      "developer-token": googleAdsDeveloperToken(),
      "Content-Type": "application/json",
    };
  }

  private async apiGet<T>(userId: string, path: string): Promise<T> {
    const headers = await this.getHeaders(userId);
    const res = await fetch(`${BASE_URL}${path}`, { headers });
    if (!res.ok) {
      throw new Error(`Google Ads API GET ${path} failed: ${res.status}`);
    }
    return (await res.json()) as T;
  }

  private async apiPost<T>(userId: string, path: string, body: unknown): Promise<T> {
    const headers = await this.getHeaders(userId);
    const res = await fetch(`${BASE_URL}${path}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      throw new Error(`Google Ads API POST ${path} failed: ${res.status}`);
    }
    return (await res.json()) as T;
  }

  async listCustomerAccounts(userId: string): Promise<GoogleAdsAccount[]> {
    const list = await this.apiGet<{ resourceNames?: string[] }>(
      userId,
      "/customers:listAccessibleCustomers",
    );
    const resourceNames = (list.resourceNames ?? []).slice(0, 10);
    const accounts: GoogleAdsAccount[] = [];

    for (const resourceName of resourceNames) {
      const customerId = parseResourceSegment(resourceName, "customers");
      if (!customerId) continue;
      const detail = await this.apiGet<{
        descriptiveName?: string;
        currencyCode?: string;
        timeZone?: string;
      }>(userId, `/customers/${customerId}`);
      accounts.push({
        customerId,
        name: detail.descriptiveName ?? customerId,
        currencyCode: detail.currencyCode ?? "",
        timeZone: detail.timeZone ?? "",
      });
    }

    return accounts;
  }

  async createBudget(
    userId: string,
    customerId: string,
    dailyBudgetMicros: number,
  ): Promise<{ budgetResourceName: string }> {
    const json = await this.apiPost<{ results?: Array<{ resourceName?: string }> }>(
      userId,
      `/customers/${customerId}/campaignBudgets:mutate`,
      {
        operations: [
          {
            create: {
              name: `NELVYON_budget_${Date.now()}`,
              amountMicros: dailyBudgetMicros.toString(),
              deliveryMethod: "STANDARD",
            },
          },
        ],
      },
    );
    const budgetResourceName = json.results?.[0]?.resourceName;
    if (!budgetResourceName) {
      throw new Error("Google Ads budget mutate missing resourceName");
    }
    return { budgetResourceName };
  }

  async createCampaign(
    userId: string,
    customerId: string,
    campaign: GoogleAdsCampaignInput,
  ): Promise<{ campaignId: string; resourceName: string }> {
    const json = await this.apiPost<{ results?: Array<{ resourceName?: string }> }>(
      userId,
      `/customers/${customerId}/campaigns:mutate`,
      {
        operations: [
          {
            create: {
              name: campaign.name,
              advertisingChannelType: campaign.channelType ?? "SEARCH",
              status: "PAUSED",
              manualCpc: {},
              networkSettings: {
                targetGoogleSearch: true,
                targetSearchNetwork: true,
                targetContentNetwork: false,
              },
              campaignBudget: campaign.budgetResourceName,
            },
          },
        ],
      },
    );
    const resourceName = json.results?.[0]?.resourceName;
    if (!resourceName) {
      throw new Error("Google Ads campaign mutate missing resourceName");
    }
    const campaignId = parseResourceSegment(resourceName, "campaigns");
    this.logger.info("google_ads_campaign_created", { userId, customerId, campaignId });
    return { campaignId, resourceName };
  }

  async createAdGroup(
    userId: string,
    customerId: string,
    adGroup: GoogleAdsAdGroupInput,
  ): Promise<{ adGroupId: string; resourceName: string }> {
    const json = await this.apiPost<{ results?: Array<{ resourceName?: string }> }>(
      userId,
      `/customers/${customerId}/adGroups:mutate`,
      {
        operations: [
          {
            create: {
              name: adGroup.name,
              campaign: adGroup.campaignResourceName,
              status: "ENABLED",
              type: "SEARCH_STANDARD",
              cpcBidMicros: adGroup.cpcBidMicros?.toString() ?? "1000000",
            },
          },
        ],
      },
    );
    const resourceName = json.results?.[0]?.resourceName;
    if (!resourceName) {
      throw new Error("Google Ads ad group mutate missing resourceName");
    }
    const adGroupId = parseResourceSegment(resourceName, "adGroups");
    return { adGroupId, resourceName };
  }

  async addKeywords(
    userId: string,
    customerId: string,
    adGroupResourceName: string,
    keywords: string[],
  ): Promise<void> {
    await this.apiPost(userId, `/customers/${customerId}/adGroupCriteria:mutate`, {
      operations: keywords.map((kw) => ({
        create: {
          adGroup: adGroupResourceName,
          status: "ENABLED",
          keyword: { text: kw, matchType: "BROAD" },
        },
      })),
    });
  }

  async createResponsiveSearchAd(
    userId: string,
    customerId: string,
    ad: GoogleAdsRSAInput,
  ): Promise<{ adId: string }> {
    const json = await this.apiPost<{ results?: Array<{ resourceName?: string }> }>(
      userId,
      `/customers/${customerId}/adGroupAds:mutate`,
      {
        operations: [
          {
            create: {
              adGroup: ad.adGroupResourceName,
              status: "PAUSED",
              ad: {
                responsiveSearchAd: {
                  headlines: ad.headlines.slice(0, 15).map((h) => ({ text: h })),
                  descriptions: ad.descriptions.slice(0, 4).map((d) => ({ text: d })),
                  finalUrls: [ad.finalUrl],
                },
              },
            },
          },
        ],
      },
    );
    const resourceName = json.results?.[0]?.resourceName;
    if (!resourceName) {
      throw new Error("Google Ads ad mutate missing resourceName");
    }
    const adId = parseResourceSegment(resourceName, "adGroupAds");
    return { adId };
  }

  async enableCampaign(userId: string, customerId: string, campaignResourceName: string): Promise<void> {
    await this.apiPost(userId, `/customers/${customerId}/campaigns:mutate`, {
      operations: [
        {
          update: {
            resourceName: campaignResourceName,
            status: "ENABLED",
          },
          updateMask: "status",
        },
      ],
    });
  }
}
