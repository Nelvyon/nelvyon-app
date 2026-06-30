/** Rich demo payloads for pack elite snapshots only — not used in production BFF fallbacks. */

export function buildDemoAdsUnified() {
  const googleCampaigns = [
    { campaign_id: "g1", campaign_name: "Search · Marca", impressions: 12400, clicks: 890, ctr: 7.2, cost: 420.5, cpc: 0.47, roas: 3.8 },
    { campaign_id: "g2", campaign_name: "Performance Max", impressions: 28600, clicks: 1120, ctr: 3.9, cost: 680.0, cpc: 0.61, roas: 2.4 },
    { campaign_id: "g3", campaign_name: "Remarketing", impressions: 8200, clicks: 410, ctr: 5.0, cost: 195.3, cpc: 0.48, roas: 4.1 },
  ];
  const metaCampaigns = [
    { campaign_id: "m1", campaign_name: "Advantage+ Catálogo", impressions: 45200, reach: 18400, spend: 520.0, cpm: 11.5, roas: 2.9 },
    { campaign_id: "m2", campaign_name: "Retargeting 7d", impressions: 22100, reach: 9800, spend: 310.0, cpm: 14.0, roas: 3.2 },
  ];
  const googleSpend = googleCampaigns.reduce((a, c) => a + c.cost, 0);
  const metaSpend = metaCampaigns.reduce((a, c) => a + c.spend, 0);
  return {
    google: {
      summary: {
        impressions: googleCampaigns.reduce((a, c) => a + c.impressions, 0),
        clicks: googleCampaigns.reduce((a, c) => a + c.clicks, 0),
        ctr: 4.8,
        cpc: 0.52,
        cost: googleSpend,
        roas: 3.1,
      },
      campaigns: googleCampaigns,
      mock: true,
    },
    meta: {
      summary: {
        impressions: metaCampaigns.reduce((a, c) => a + c.impressions, 0),
        reach: 28200,
        spend: metaSpend,
        cpm: 12.4,
        roas: 3.0,
      },
      campaigns: metaCampaigns,
      mock: true,
    },
    unified: { total_spend: Math.round((googleSpend + metaSpend) * 100) / 100, blended_roas: 3.05 },
  };
}

export function buildDemoSocialUnified() {
  return {
    scheduler: {
      connected_accounts: 3,
      accounts: [{ platform: "instagram" }, { platform: "linkedin" }, { platform: "facebook" }],
      legacy_posts: { total: 48, published: 32, scheduled: 8, failed: 0 },
      mentions: [],
    },
    monitoring: {
      mentions_24h: 47,
      positive_percent: 62,
      negative_percent: 11,
      avg_sentiment_score: 0.71,
      active_alerts: 2,
      alerts: [],
      recent_mentions: [],
      top_keywords: [
        { keyword: "nelvyon", count: 24 },
        { keyword: "marketing", count: 18 },
        { keyword: "automatización", count: 12 },
        { keyword: "crm", count: 9 },
        { keyword: "growth", count: 7 },
      ],
      sentiment_by_day: [0.6, 0.65, 0.7, 0.68, 0.72, 0.71, 0.74],
    },
    auto_publish: {
      client_id: "ws-client-1",
      by_platform: {
        instagram: { reach: 12400, likes: 890, comments: 124 },
        linkedin: { reach: 8200, likes: 340, comments: 56 },
        facebook: { reach: 5600, likes: 210, comments: 38 },
      },
      mock: true,
    },
    unified: {
      connected_accounts: 3,
      posts_scheduled: 8,
      posts_published: 32,
      mentions_24h: 47,
      total_reach: 26200,
      total_engagement: 1658,
      sentiment_net: 51,
      active_alerts: 2,
      mock: true,
    },
  };
}

export function buildDemoFunnelsUnified() {
  return {
    funnels: {
      items: [
        { id: "demo-f1", name: "Captación Local · Q2", status: "active", step_count: 4, steps: [] },
        { id: "demo-f2", name: "Webinar → CRM", status: "active", step_count: 5, steps: [] },
      ],
      mock: true,
    },
    crm: { deals_total: 18, pipeline_value: 42500 },
    ads: { total_spend: 1295.8, blended_roas: 3.05 },
    demo_analytics: {
      funnel_id: "demo-f1",
      name: "Captación Local · Q2",
      steps: [
        { step_id: "s1", name: "Anuncio", visits: 4200, conversions: 840, conversion_rate: 20, drop_off_rate: 0 },
        { step_id: "s2", name: "Landing", visits: 840, conversions: 420, conversion_rate: 50, drop_off_rate: 50 },
        { step_id: "s3", name: "Formulario", visits: 420, conversions: 168, conversion_rate: 40, drop_off_rate: 60 },
        { step_id: "s4", name: "CRM", visits: 168, conversions: 84, conversion_rate: 50, drop_off_rate: 50, attributed_revenue: 12400 },
      ],
      total_attributed_revenue: 12400,
    },
    unified: {
      active_funnels: 2,
      total_funnels: 2,
      total_visits: 5628,
      total_conversions: 1512,
      avg_conversion_rate: 40,
      attributed_revenue: 12400,
      deals_total: 18,
      ads_spend: 1295.8,
      ads_roas: 3.05,
      mock: true,
    },
  };
}

export function buildDemoEcommerceUnified() {
  return {
    stores: {
      items: [
        { id: "demo-store-1", name: "Tienda Demo · Verano", status: "published" },
        { id: "demo-store-2", name: "Outlet · Flash", status: "draft" },
      ],
      mock: true,
    },
    ads: { total_spend: 830.0, blended_roas: 2.8 },
    email: { campaigns_total: 6, active_campaigns: 2 },
    demo_analytics: {
      total_revenue_cents: 2489000,
      visits: 8420,
      conversion_rate: 3.2,
      pending_orders: 34,
      cart_abandonment_rate: 68.5,
      checkout_completed: 89,
      orders_by_status: { paid: { count: 89, revenue_cents: 2489000 }, pending: { count: 34, revenue_cents: 0 } },
      top_products: [
        { name: "Pack Starter", qty: 42 },
        { name: "Suscripción Pro", qty: 28 },
        { name: "Consultoría 1h", qty: 19 },
      ],
    },
    unified: {
      total_stores: 2,
      published_stores: 1,
      total_revenue_cents: 2489000,
      total_visits: 8420,
      avg_conversion_rate: 3.2,
      pending_checkouts: 34,
      paid_orders: 89,
      cart_abandonment_rate: 68.5,
      ads_spend: 830,
      ads_roas: 2.8,
      email_campaigns: 6,
      mock: true,
    },
  };
}

export const DEMO_CRM_PIPELINE = {
  by_stage: [
    { stage: "lead", count: 12, value: 18000 },
    { stage: "qualified", count: 8, value: 32000 },
    { stage: "proposal", count: 5, value: 45000 },
    { stage: "negotiation", count: 3, value: 28000 },
    { stage: "won", count: 6, value: 72000 },
    { stage: "lost", count: 4, value: 0 },
  ],
  total_count: 38,
  total_value: 195000,
  mock: true,
};

export const DEMO_CRM_DEALS = [
  { id: "demo-d1", title: "Acme Corp · Plan Growth", stage: "proposal" },
  { id: "demo-d2", title: "Clínica Dental Norte", stage: "negotiation" },
  { id: "demo-d3", title: "Ecommerce Moda SL", stage: "qualified" },
  { id: "demo-d4", title: "SaaS B2B · Enterprise", stage: "lead" },
  { id: "demo-d5", title: "Restaurante La Plaza", stage: "won" },
];

export const DEMO_CRM_CLIENTS_COUNT = 24;

export const DEMO_ROAS_ALERTS = {
  threshold: 1.5,
  alerts: [
    { platform: "meta", message: "ROAS Meta por debajo de 1,5 en campaña Retargeting 7d", severity: "warning" },
  ],
};
