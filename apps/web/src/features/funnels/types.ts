export type FunnelStep = {
  id?: string;
  funnel_id?: string;
  step_order?: number;
  name: string;
  landing_page_id?: string | null;
  next_step_id?: string | null;
  exit_url?: string | null;
};

export type Funnel = {
  id: string;
  name: string;
  status: string;
  campaign_id?: number | null;
  step_count?: number;
  steps?: FunnelStep[];
  metadata?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
};

export type FunnelAnalytics = {
  funnel_id: string;
  name: string;
  campaign_id?: number | null;
  steps: Array<{
    step_id: string;
    name: string;
    landing_page_id?: string;
    visits: number;
    conversions: number;
    conversion_rate: number;
    drop_off_rate: number;
    attributed_revenue?: number;
  }>;
  total_attributed_revenue: number;
};

export type UnifiedFunnelsReporting = {
  funnels: { items: Funnel[] };
  crm: { deals_total: number; pipeline_value: number };
  ads: { total_spend: number; blended_roas: number };
  unified: {
    active_funnels: number;
    total_funnels: number;
    total_visits: number;
    total_conversions: number;
    avg_conversion_rate: number;
    attributed_revenue: number;
    deals_total: number;
    ads_spend: number;
    ads_roas: number;
  };
};
