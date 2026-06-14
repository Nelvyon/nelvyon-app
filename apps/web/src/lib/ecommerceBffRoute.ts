import { adsBffGet, adsBffPost } from "@/lib/adsBffRoute";

export { adsBffGet as ecommerceBffGet, adsBffPost as ecommerceBffPost };

export const EMPTY_STORES_LIST = { items: [] as unknown[] };

export const EMPTY_STORE = {
  id: "",
  name: "",
  status: "draft",
  products: [] as unknown[],
};

export const EMPTY_STORE_ANALYTICS = {
  total_revenue_cents: 0,
  orders_by_status: {} as Record<string, { count: number; revenue_cents: number }>,
  pending_orders: 0,
  top_products: [] as Array<{ name?: string; qty?: number }>,
  visits: 0,
  conversion_rate: 0,
  cart_abandonment_rate: 0,
  checkout_completed: 0,
};

export const EMPTY_UNIFIED_ECOMMERCE = {
  stores: EMPTY_STORES_LIST,
  ads: { total_spend: 0, blended_roas: 0 },
  email: { campaigns_total: 0, active_campaigns: 0 },
  unified: {
    total_stores: 0,
    published_stores: 0,
    total_revenue_cents: 0,
    total_visits: 0,
    avg_conversion_rate: 0,
    pending_checkouts: 0,
    paid_orders: 0,
    cart_abandonment_rate: 0,
    ads_spend: 0,
    ads_roas: 0,
    email_campaigns: 0,
  },
};

export function mergeUnifiedEcommerce(
  storesList: { items?: Array<{ id?: string; status?: string }> },
  ads: { unified?: { total_spend?: number; blended_roas?: number } },
  campaigns: { items?: Array<{ status?: string }>; total?: number },
  analyticsSamples: Array<{
    total_revenue_cents?: number;
    visits?: number;
    conversion_rate?: number;
    pending_orders?: number;
    orders_by_status?: Record<string, { count?: number }>;
  }>,
) {
  const items = storesList.items ?? [];
  let totalRevenue = 0;
  let totalVisits = 0;
  let rateSum = 0;
  let rateCount = 0;
  let pendingCheckouts = 0;
  let paidOrders = 0;

  for (const sample of analyticsSamples) {
    totalRevenue += Number(sample.total_revenue_cents ?? 0);
    totalVisits += Number(sample.visits ?? 0);
    pendingCheckouts += Number(sample.pending_orders ?? 0);
    paidOrders += Number(sample.orders_by_status?.paid?.count ?? 0);
    if (sample.conversion_rate != null) {
      rateSum += Number(sample.conversion_rate);
      rateCount += 1;
    }
  }

  const campaignItems = campaigns.items ?? [];
  const campaignsTotal = campaigns.total ?? campaignItems.length;
  const cartAbandon =
    pendingCheckouts + paidOrders > 0
      ? Math.round((pendingCheckouts / (pendingCheckouts + paidOrders)) * 1000) / 10
      : 0;

  return {
    stores: storesList,
    ads: {
      total_spend: Number(ads.unified?.total_spend ?? 0),
      blended_roas: Number(ads.unified?.blended_roas ?? 0),
    },
    email: {
      campaigns_total: campaignsTotal,
      active_campaigns: campaignItems.filter((c) => c.status === "active" || c.status === "running").length,
    },
    unified: {
      total_stores: items.length,
      published_stores: items.filter((s) => s.status === "published" || s.status === "ready").length,
      total_revenue_cents: totalRevenue,
      total_visits: totalVisits,
      avg_conversion_rate: rateCount ? Math.round((rateSum / rateCount) * 10) / 10 : 0,
      pending_checkouts: pendingCheckouts,
      paid_orders: paidOrders,
      cart_abandonment_rate: cartAbandon,
      ads_spend: Number(ads.unified?.total_spend ?? 0),
      ads_roas: Number(ads.unified?.blended_roas ?? 0),
      email_campaigns: campaignsTotal,
    },
  };
}
