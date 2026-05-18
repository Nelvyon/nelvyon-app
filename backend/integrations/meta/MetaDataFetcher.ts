import { createLogger } from "../../logger";
import { OAuthService } from "../../oauth/OAuthService";

const META_API_VERSION = "v19.0";
const BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`;

export interface MetaCampaignInsightRow {
  campaignName: string;
  impressions: number;
  clicks: number;
  spend: number;
  ctr: number;
  cpc: number;
  conversions: number;
  roas: number;
}

export interface MetaAdsInsights {
  campaigns: MetaCampaignInsightRow[];
  totalSpend: number;
  totalConversions: number;
  avgRoas: number;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function parseNum(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number.parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

let inst: MetaDataFetcher | undefined;

export class MetaDataFetcher {
  private readonly oauth = OAuthService.instance();
  private readonly logger = createLogger("meta_data");

  static instance(): MetaDataFetcher {
    if (!inst) inst = new MetaDataFetcher();
    return inst;
  }

  static reset(): void {
    inst = undefined;
  }

  private async getToken(userId: string): Promise<string | null> {
    const connection = await this.oauth.getConnection(userId, "meta");
    if (!connection) return null;
    return connection.accessToken;
  }

  async getAdAccountInsights(
    userId: string,
    adAccountId: string,
    days: number = 30,
  ): Promise<MetaAdsInsights | null> {
    const token = await this.getToken(userId);
    if (!token) return null;

    const preset = days <= 7 ? "last_7d" : days <= 14 ? "last_14d" : "last_30d";
    const params = new URLSearchParams({
      fields:
        "campaign_name,impressions,clicks,spend,ctr,cpc,actions,purchase_roas",
      date_preset: preset,
      level: "campaign",
      access_token: token,
    });

    try {
      const res = await fetch(`${BASE_URL}/${adAccountId}/insights?${params.toString()}`);
      if (!res.ok) {
        this.logger.warn("meta_insights_fetch_failed", { userId, status: res.status });
        return null;
      }

      const json = (await res.json()) as {
        data?: Array<{
          campaign_name?: string;
          impressions?: string;
          clicks?: string;
          spend?: string;
          ctr?: string;
          cpc?: string;
          actions?: Array<{ action_type?: string; value?: string }>;
          purchase_roas?: Array<{ value?: string }>;
        }>;
      };

      const campaigns: MetaCampaignInsightRow[] = (json.data ?? []).map((row) => {
        const purchaseAction = row.actions?.find(
          (a) => a.action_type === "purchase" || a.action_type === "offsite_conversion.fb_pixel_purchase",
        );
        const conversions = parseNum(purchaseAction?.value);
        const roasEntry = row.purchase_roas?.[0];
        const roas = parseNum(roasEntry?.value);

        return {
          campaignName: row.campaign_name ?? "",
          impressions: parseNum(row.impressions),
          clicks: parseNum(row.clicks),
          spend: round2(parseNum(row.spend)),
          ctr: round2(parseNum(row.ctr)),
          cpc: round2(parseNum(row.cpc)),
          conversions,
          roas,
        };
      });

      const totalSpend = round2(campaigns.reduce((s, c) => s + c.spend, 0));
      const totalConversions = campaigns.reduce((s, c) => s + c.conversions, 0);
      const roasValues = campaigns.filter((c) => c.roas > 0).map((c) => c.roas);
      const avgRoas =
        roasValues.length > 0 ? round2(roasValues.reduce((s, r) => s + r, 0) / roasValues.length) : 0;

      return { campaigns, totalSpend, totalConversions, avgRoas };
    } catch (err: unknown) {
      this.logger.warn("meta_insights_fetch_error", {
        userId,
        error: err instanceof Error ? err.message : String(err),
      });
      return null;
    }
  }
}
