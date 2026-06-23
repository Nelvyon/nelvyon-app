/** Growth Pack product types — Local, Ecommerce, SaaS B2B */

export const LOCAL_GROWTH_PACK_ID = "local-business-growth" as const;
export const ECOMMERCE_GROWTH_PACK_ID = "ecommerce-growth" as const;
export const SAAS_B2B_GROWTH_PACK_ID = "saas-b2b-growth" as const;
export const ANALYTICS_INSIGHTS_PACK_ID = "analytics-insights" as const;

export type PackId =
  | typeof LOCAL_GROWTH_PACK_ID
  | typeof ECOMMERCE_GROWTH_PACK_ID
  | typeof SAAS_B2B_GROWTH_PACK_ID;

/** Pack IDs that expose a report dashboard via pack-report BFF. */
export type ReportPackId = PackId | typeof ANALYTICS_INSIGHTS_PACK_ID;

export type PackReportDataProvenance = "demo" | "ga4" | "meta_ads" | "pending";

export type PackLiveInsight = {
  headline: string;
  channel_breakdown: { channel: string; sessions: number; share_pct: number }[];
  landing_gap?: {
    path: string;
    sessions: number;
    conversion_rate_pct: number;
    site_avg_conversion_rate_pct: number;
    gap_pct: number;
  };
  missing_events?: string[];
  period_days: number;
  property_id?: string;
};

export type PackRunStatus = "running" | "completed" | "failed" | "needs_review";
export type PackStepStatus = "pending" | "running" | "done" | "failed" | "skipped";

export type PackStep = {
  key: string;
  label: string;
  status: PackStepStatus;
  detail?: string;
  at?: string;
};

export type GrowthPackIntakeBase = {
  business_name: string;
  city: string;
  country?: string;
  contact_email?: string;
  contact_name?: string;
  value_proposition: string;
  primary_cta: string;
  website_url?: string;
  tier?: "professional" | "premium";
  /** Catalog focus when launched from SEO Local, Meta Ads, Email or Landing+Funnel. */
  catalog_focus?: "seo" | "meta" | "email" | "landing";
};

export type LocalGrowthSector =
  | "restaurant"
  | "dental"
  | "fitness"
  | "beauty"
  | "real_estate"
  | "coaching";

export type LocalGrowthPackIntake = GrowthPackIntakeBase & {
  sector: LocalGrowthSector;
};

export type EcommerceGrowthPackIntake = GrowthPackIntakeBase & {
  sector: "ecommerce" | "marketplace" | "dtc_brand";
  product_category: string;
  avg_order_value?: string;
  primary_channel?: "meta" | "google" | "organic";
};

export type SaasB2bGrowthPackIntake = GrowthPackIntakeBase & {
  sector: "saas_b2b" | "devtools" | "fintech_b2b";
  icp_title: string;
  pricing_model?: "subscription" | "usage" | "hybrid";
  sales_motion?: "plg" | "sales_led" | "hybrid";
};

export type SkuRunResult = {
  sku: string;
  qa_score: number;
  passed: boolean;
  escalated: boolean;
  deliverable_ids: string[];
};

export type PackReportRecommendation = {
  action: string;
  impact: string;
  priority: "high" | "medium" | "low";
};

export type PackReportSection = {
  id: string;
  title: string;
  summary: string;
  bullets: string[];
  recommendations: PackReportRecommendation[];
  metrics?: { label: string; value: string }[];
};

export type PackParentComplement = {
  specialized_pack_id: string;
  specialized_pack_name: string;
  parent_pack_id: PackId;
  parent_pack_name: string;
  headline: string;
  how_it_complements: string[];
  included_in_parent: string[];
  upgrade_cta: string;
};

export type PackReport = {
  pack_name: string;
  pack_id: PackId | string;
  business_name: string;
  sector: string;
  completed_at: string;
  summary: string;
  kpis: {
    deliverables_published: number;
    avg_qa_score: number;
    skus_passed: number;
    skus_total: number;
    saas_client_id: number | null;
    saas_campaign_id: number | null;
    extra_campaigns?: number;
    landing_live_url?: string;
    welcome_email_status?: string;
    welcome_touches?: number;
    nurture_email_status?: string;
    nurture_touches?: number;
  };
  sku_results: SkuRunResult[];
  next_steps: string[];
  portal_path: string;
  data_provenance?: PackReportDataProvenance;
  live_insight?: PackLiveInsight;
  /** Rich demo sections for dashboard / portal (fake data, demo-safe). */
  sections?: PackReportSection[];
  /** Set when kickoff came from a specialized catalog entry (?focus=). */
  launch_focus?: "seo" | "meta" | "email" | "landing";
  parent_complement?: PackParentComplement;
  highlight_section_ids?: string[];
};

export type PackRunRecord = {
  id: string;
  workspace_id: number;
  user_id: string;
  pack_id: string;
  status: PackRunStatus;
  intake: GrowthPackIntakeBase & { sector: string };
  saas_client_id: number | null;
  saas_campaign_id: number | null;
  os_client_id: string | null;
  os_project_id: string | null;
  steps: PackStep[];
  report: PackReport | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
};

const BASE_STEPS: { key: string; label: string }[] = [
  { key: "intake", label: "Brief recibido" },
  { key: "saas_client", label: "Cliente en panel SaaS (Revenue)" },
  { key: "saas_campaign", label: "Campaña principal creada" },
  { key: "os_client", label: "Cliente OS provisionado" },
  { key: "os_project", label: "Proyecto OS creado" },
  { key: "sku_landing", label: "Landing autónoma (NELVYON-LANDING)" },
  { key: "sku_seo", label: "Auditoría SEO (NELVYON-SEO)" },
  { key: "sku_chatbot", label: "Chatbot (NELVYON-CHATBOT)" },
  { key: "report", label: "Informe Growth Pack en portal" },
  { key: "complete", label: "Pack completado" },
];

export const LOCAL_PACK_STEP_DEFINITIONS = BASE_STEPS;
export const ECOMMERCE_PACK_STEP_DEFINITIONS = [
  ...BASE_STEPS.slice(0, 3),
  { key: "saas_campaign_abandoned", label: "Campaña carrito abandonado" },
  ...BASE_STEPS.slice(3, 8),
  { key: "meta_ads_kit", label: "Kit Meta Ads Advantage+" },
  ...BASE_STEPS.slice(8),
];
export const SAAS_B2B_PACK_STEP_DEFINITIONS = [
  ...BASE_STEPS.slice(0, 8),
  { key: "outbound_playbook", label: "Playbook Outbound / ABM" },
  ...BASE_STEPS.slice(8),
];

export type AnalyticsInsightsPackIntake = {
  business_name: string;
  property_id?: string;
  landing_path?: string;
  period_days?: 7 | 28 | 90;
  parent_pack_id?: PackId;
  /** Staging/demo sin OAuth GA4 — datos fixture etiquetados como demo. */
  demo_mode?: boolean;
};

export const ANALYTICS_INSIGHTS_STEP_DEFINITIONS = [
  { key: "intake", label: "Brief recibido" },
  { key: "ga4_auth", label: "Conexión GA4 verificada" },
  { key: "ga4_fetch", label: "Extracción métricas GA4" },
  { key: "insight_compute", label: "Cálculo insight MVP" },
  { key: "report", label: "Informe Analytics Insights" },
  { key: "complete", label: "Pack completado" },
];

/** @deprecated use LOCAL_PACK_STEP_DEFINITIONS */
export const PACK_STEP_DEFINITIONS = LOCAL_PACK_STEP_DEFINITIONS;
