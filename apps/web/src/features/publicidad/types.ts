export type AdsBriefingPayload = {
  product: string;
  audience: string;
  goal: string;
  daily_budget_eur: number;
  creative_image_url?: string | null;
  notes?: string;
  launch: boolean;
};

export type AdsCampaignRow = {
  campaign_id?: string;
  campaign_name?: string;
  impressions?: number;
  clicks?: number;
  ctr?: number;
  cost?: number;
  spend?: number;
  roas?: number;
  cpm?: number;
  reach?: number;
};

export type AdsRoasAlert = {
  platform: string;
  message: string;
  severity: string;
  roas?: number;
};

export type UnifiedReporting = {
  google: { summary: Record<string, number>; campaigns: AdsCampaignRow[]; mock?: boolean };
  meta: { summary: Record<string, number>; campaigns: AdsCampaignRow[]; mock?: boolean };
  unified: { total_spend: number; blended_roas: number };
};
