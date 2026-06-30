import { bffDegraded, BFF_DEGRADED_NO_DATA, BFF_DEGRADED_UPSTREAM } from "@/lib/bffDegraded";
import { adsBffGet, adsBffPost } from "@/lib/adsBffRoute";

export { adsBffGet as funnelsBffGet, adsBffPost as funnelsBffPost };

export const EMPTY_FUNNELS_LIST = { items: [] as unknown[] };

export const EMPTY_FUNNEL = {
  id: "",
  name: "",
  status: "draft",
  steps: [] as unknown[],
  step_count: 0,
};

export const EMPTY_FUNNEL_ANALYTICS = {
  funnel_id: "",
  name: "",
  campaign_id: null as number | null,
  steps: [] as Array<{
    step_id: string;
    name: string;
    visits: number;
    conversions: number;
    conversion_rate: number;
    drop_off_rate: number;
    attributed_revenue?: number;
  }>,
  total_attributed_revenue: 0,
};

export const EMPTY_UNIFIED_FUNNELS = {
  funnels: EMPTY_FUNNELS_LIST,
  crm: { deals_total: 0, pipeline_value: 0 },
  ads: { total_spend: 0, blended_roas: 0 },
  unified: {
    active_funnels: 0,
    total_funnels: 0,
    total_visits: 0,
    total_conversions: 0,
    avg_conversion_rate: 0,
    attributed_revenue: 0,
    deals_total: 0,
    ads_spend: 0,
    ads_roas: 0,
  },
};

export function mergeUnifiedFunnels(
  funnelsList: { items?: Array<{ status?: string; step_count?: number }> },
  deals: { items?: unknown[]; total?: number },
  ads: { unified?: { total_spend?: number; blended_roas?: number } },
  analyticsSamples: Array<{ steps?: Array<{ visits?: number; conversions?: number; conversion_rate?: number }>; total_attributed_revenue?: number }>,
) {
  const items = funnelsList.items ?? [];
  let totalVisits = 0;
  let totalConversions = 0;
  let rateSum = 0;
  let rateCount = 0;
  let revenue = 0;

  for (const sample of analyticsSamples) {
    revenue += Number(sample.total_attributed_revenue ?? 0);
    for (const step of sample.steps ?? []) {
      totalVisits += Number(step.visits ?? 0);
      totalConversions += Number(step.conversions ?? 0);
      if (step.conversion_rate != null) {
        rateSum += Number(step.conversion_rate);
        rateCount += 1;
      }
    }
  }

  const dealsTotal = deals.total ?? deals.items?.length ?? 0;

  return {
    funnels: funnelsList,
    crm: { deals_total: dealsTotal, pipeline_value: 0 },
    ads: {
      total_spend: Number(ads.unified?.total_spend ?? 0),
      blended_roas: Number(ads.unified?.blended_roas ?? 0),
    },
    unified: {
      active_funnels: items.filter((f) => f.status === "active").length,
      total_funnels: items.length,
      total_visits: totalVisits,
      total_conversions: totalConversions,
      avg_conversion_rate: rateCount ? Math.round((rateSum / rateCount) * 10) / 10 : 0,
      attributed_revenue: Math.round(revenue * 100) / 100,
      deals_total: dealsTotal,
      ads_spend: Number(ads.unified?.total_spend ?? 0),
      ads_roas: Number(ads.unified?.blended_roas ?? 0),
    },
  };
}

export function emptyUnifiedFunnels(reason = BFF_DEGRADED_NO_DATA) {
  return bffDegraded(
    mergeUnifiedFunnels(
      EMPTY_FUNNELS_LIST as { items?: Array<{ status?: string; step_count?: number }> },
      { items: [], total: 0 },
      { unified: { total_spend: 0, blended_roas: 0 } },
      [],
    ),
    reason,
  );
}

export const EMPTY_UNIFIED_FUNNELS_DEGRADED = emptyUnifiedFunnels(BFF_DEGRADED_UPSTREAM);

export const DEFAULT_FUNNEL_STEPS = [
  { name: "Anuncio", exit_url: "/publicidad" },
  { name: "Landing", exit_url: "/dashboard/landing-pages" },
  { name: "Formulario", exit_url: null },
  { name: "CRM", exit_url: "/crm/deals/new" },
] as const;
