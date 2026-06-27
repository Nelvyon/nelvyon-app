/** Growth Pack product types — Local, Ecommerce, SaaS B2B */

export const LOCAL_GROWTH_PACK_ID = "local-business-growth" as const;
export const ECOMMERCE_GROWTH_PACK_ID = "ecommerce-growth" as const;
export const SAAS_B2B_GROWTH_PACK_ID = "saas-b2b-growth" as const;
export const SOCIAL_CALENDAR_PACK_ID = "social-calendar-pack" as const;
export const CONTENT_STRATEGY_PACK_ID = "content-strategy-pack" as const;
export const CRO_AUDIT_PACK_ID = "cro-audit-pack" as const;
export const ANALYTICS_SETUP_PACK_ID = "analytics-setup-pack" as const;
export const BRAND_VOICE_PACK_ID = "brand-voice-pack" as const;

export type PackId =
  | typeof LOCAL_GROWTH_PACK_ID
  | typeof ECOMMERCE_GROWTH_PACK_ID
  | typeof SAAS_B2B_GROWTH_PACK_ID
  | typeof SOCIAL_CALENDAR_PACK_ID
  | typeof CONTENT_STRATEGY_PACK_ID
  | typeof CRO_AUDIT_PACK_ID
  | typeof ANALYTICS_SETUP_PACK_ID
  | typeof BRAND_VOICE_PACK_ID;

/** Common intake for the 5 beta packs (minimal fields, sector required) */
export type BetaPackIntake = GrowthPackIntakeBase & {
  sector: string;
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
  qa_visual_score?: number;
  qa_legal_passed?: boolean;
  qa_gate_status?: string;
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
  };
  sku_results: SkuRunResult[];
  next_steps: string[];
  portal_path: string;
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

/** @deprecated use LOCAL_PACK_STEP_DEFINITIONS */
export const PACK_STEP_DEFINITIONS = LOCAL_PACK_STEP_DEFINITIONS;

const BETA_BASE_STEPS: { key: string; label: string }[] = [
  { key: "intake", label: "Brief recibido" },
  { key: "saas_client", label: "Cliente en panel SaaS" },
  { key: "saas_campaign", label: "Campaña principal creada" },
  { key: "os_client", label: "Cliente OS provisionado" },
  { key: "os_project", label: "Proyecto OS creado" },
  { key: "sku_landing", label: "Entregable autónomo (NELVYON-LANDING)" },
  { key: "report", label: "Informe en portal" },
  { key: "complete", label: "Pack completado" },
];
export const SOCIAL_CALENDAR_PACK_STEP_DEFINITIONS = BETA_BASE_STEPS;
export const CONTENT_STRATEGY_PACK_STEP_DEFINITIONS = BETA_BASE_STEPS;
export const CRO_AUDIT_PACK_STEP_DEFINITIONS = BETA_BASE_STEPS;
export const ANALYTICS_SETUP_PACK_STEP_DEFINITIONS = BETA_BASE_STEPS;
export const BRAND_VOICE_PACK_STEP_DEFINITIONS = BETA_BASE_STEPS;
