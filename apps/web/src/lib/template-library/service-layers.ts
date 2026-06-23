/**
 * Nelvyon service taxonomy — SaaS (client-facing) vs OS (internal capabilities).
 * Single technical template library; separate service namespaces at resolve time.
 */
import { OS_PREMIUM_SERVICE_IDS } from "../../../../../backend/os-agents/constants";

export type ServiceLayer = "saas" | "os" | "both";

export type TemplateKindName =
  | "landing"
  | "funnel"
  | "email_sequence"
  | "email"
  | "ad_creative"
  | "seo_page"
  | "content_page"
  | "automation_recipe"
  | "report_section"
  | "chatbot_flow"
  | "brand_asset"
  | "web_page"
  | "store_page"
  | "workflow_diagram"
  | "analytics_report"
  | "social_post"
  | "video_script"
  | "creative_graphic";

export type SaasServiceDef = {
  id: string;
  label: string;
  origin: "pack" | "commercial_sku" | "marketing_site" | "saas_feature";
  pack_id?: string;
  sku?: string;
  dual_os_id?: string;
  kinds: TemplateKindName[];
};

export type OsCapabilityDef = {
  id: string;
  label: string;
  os_premium_id?: string;
  dual_saas_id?: string;
  kinds: TemplateKindName[];
};

const K = {
  landing: "landing" as const,
  funnel: "funnel" as const,
  emailSeq: "email_sequence" as const,
  email: "email" as const,
  ads: "ad_creative" as const,
  seo: "seo_page" as const,
  content: "content_page" as const,
  auto: "automation_recipe" as const,
  report: "report_section" as const,
  chatbot: "chatbot_flow" as const,
  brand: "brand_asset" as const,
  web: "web_page" as const,
  store: "store_page" as const,
  workflow: "workflow_diagram" as const,
  analytics: "analytics_report" as const,
  social: "social_post" as const,
  video: "video_script" as const,
  graphic: "creative_graphic" as const,
};

export const SAAS_SERVICES: SaasServiceDef[] = [
  {
    id: "pack_growth_local",
    label: "Crecimiento Local",
    origin: "pack",
    pack_id: "local-business-growth",
    dual_os_id: "cap_landing_builder",
    kinds: [K.landing, K.funnel, K.emailSeq, K.seo, K.chatbot, K.report],
  },
  {
    id: "pack_growth_ecommerce",
    label: "Crecimiento Ecommerce",
    origin: "pack",
    pack_id: "ecommerce-growth",
    dual_os_id: "cap_ecommerce_premium",
    kinds: [K.landing, K.funnel, K.emailSeq, K.ads, K.store, K.report],
  },
  {
    id: "pack_growth_saas_b2b",
    label: "Crecimiento SaaS B2B",
    origin: "pack",
    pack_id: "saas-b2b-growth",
    dual_os_id: "cap_landing_builder",
    kinds: [K.landing, K.funnel, K.emailSeq, K.seo, K.content, K.report],
  },
  {
    id: "pack_seo_local",
    label: "SEO Local",
    origin: "pack",
    pack_id: "seo-local-pack",
    dual_os_id: "cap_seo_premium",
    kinds: [K.seo, K.content, K.report],
  },
  {
    id: "pack_meta_ads",
    label: "Campañas Meta Ads",
    origin: "pack",
    pack_id: "meta-ads-pack",
    dual_os_id: "cap_ads_premium",
    kinds: [K.ads, K.landing, K.funnel],
  },
  {
    id: "pack_email_nurture",
    label: "Email Welcome + Nurturing",
    origin: "pack",
    pack_id: "email-welcome-nurture",
    dual_os_id: "cap_email_marketing_premium",
    kinds: [K.emailSeq, K.email, K.auto],
  },
  {
    id: "pack_landing_funnel",
    label: "Landing + Funnel",
    origin: "pack",
    pack_id: "landing-funnel-pack",
    dual_os_id: "cap_funnel_premium",
    kinds: [K.landing, K.funnel, K.report],
  },
  {
    id: "pack_social_calendar",
    label: "Calendario Redes Sociales",
    origin: "pack",
    pack_id: "social-calendar-pack",
    dual_os_id: "cap_social_media_premium",
    kinds: [K.social, K.content, K.ads],
  },
  {
    id: "pack_content_strategy",
    label: "Estrategia de Contenidos",
    origin: "pack",
    pack_id: "content-strategy-pack",
    dual_os_id: "cap_contenido_copywriting_premium",
    kinds: [K.content, K.seo, K.emailSeq],
  },
  {
    id: "pack_cro_audit",
    label: "Auditoría CRO",
    origin: "pack",
    pack_id: "cro-audit-pack",
    dual_os_id: "cap_funnel_premium",
    kinds: [K.report, K.landing, K.funnel],
  },
  {
    id: "pack_analytics_insights",
    label: "Analytics Insights",
    origin: "pack",
    pack_id: "analytics-insights-pack",
    dual_os_id: "cap_analytics_engine",
    kinds: [K.analytics, K.report],
  },
  {
    id: "pack_analytics_setup",
    label: "Setup Analytics",
    origin: "pack",
    pack_id: "analytics-setup-pack",
    dual_os_id: "cap_analytics_engine",
    kinds: [K.analytics, K.report, K.workflow],
  },
  {
    id: "pack_brand_voice",
    label: "Voz de Marca",
    origin: "pack",
    pack_id: "brand-voice-pack",
    dual_os_id: "cap_branding_premium",
    kinds: [K.brand, K.content],
  },
  {
    id: "sku_web_corporate",
    label: "Web corporativa",
    origin: "commercial_sku",
    sku: "NELVYON-WEB",
    dual_os_id: "cap_web_premium",
    kinds: [K.web, K.seo, K.landing],
  },
  {
    id: "sku_landing",
    label: "Landing page",
    origin: "commercial_sku",
    sku: "NELVYON-LANDING",
    dual_os_id: "cap_landing_premium",
    kinds: [K.landing, K.funnel],
  },
  {
    id: "sku_ecommerce",
    label: "Ecommerce tienda",
    origin: "commercial_sku",
    sku: "NELVYON-ECOM",
    dual_os_id: "cap_ecommerce_premium",
    kinds: [K.store, K.landing, K.emailSeq],
  },
  {
    id: "sku_logo",
    label: "Logo",
    origin: "commercial_sku",
    sku: "NELVYON-LOGO",
    dual_os_id: "cap_diseno_grafico_creatividades_premium",
    kinds: [K.brand, K.graphic],
  },
  {
    id: "sku_branding",
    label: "Branding",
    origin: "commercial_sku",
    sku: "NELVYON-BRAND",
    dual_os_id: "cap_branding_premium",
    kinds: [K.brand, K.content, K.graphic],
  },
  {
    id: "sku_chatbot",
    label: "Chatbots IA",
    origin: "commercial_sku",
    sku: "NELVYON-CHATBOT",
    dual_os_id: "cap_bots_premium",
    kinds: [K.chatbot, K.auto],
  },
  {
    id: "sku_seo",
    label: "SEO (proyecto)",
    origin: "commercial_sku",
    sku: "NELVYON-SEO",
    dual_os_id: "cap_seo_premium",
    kinds: [K.seo, K.content, K.report],
  },
  {
    id: "sku_google_ads",
    label: "Google Ads setup",
    origin: "commercial_sku",
    sku: "NELVYON-GADS",
    dual_os_id: "cap_ads_premium",
    kinds: [K.ads, K.landing],
  },
  {
    id: "sku_meta_ads",
    label: "Meta Ads setup",
    origin: "commercial_sku",
    sku: "NELVYON-META",
    dual_os_id: "cap_ads_premium",
    kinds: [K.ads, K.landing],
  },
  {
    id: "sku_tiktok_ads",
    label: "TikTok Ads setup",
    origin: "commercial_sku",
    sku: "NELVYON-TIKTOK",
    dual_os_id: "cap_ads_premium",
    kinds: [K.ads, K.video, K.social],
  },
  {
    id: "sku_automation",
    label: "Automatizaciones IA",
    origin: "commercial_sku",
    sku: "NELVYON-AUTO",
    dual_os_id: "cap_consultoria_automatizacion_premium",
    kinds: [K.auto, K.workflow],
  },
  {
    id: "marketing_seo_ia",
    label: "SEO IA",
    origin: "marketing_site",
    dual_os_id: "cap_seo_premium",
    kinds: [K.seo, K.content],
  },
  {
    id: "marketing_publicidad_ia",
    label: "Publicidad IA",
    origin: "marketing_site",
    dual_os_id: "cap_ads_premium",
    kinds: [K.ads, K.landing],
  },
  {
    id: "marketing_contenido_ia",
    label: "Contenido IA",
    origin: "marketing_site",
    dual_os_id: "cap_contenido_copywriting_premium",
    kinds: [K.content, K.social],
  },
  {
    id: "marketing_email_ia",
    label: "Email IA",
    origin: "marketing_site",
    dual_os_id: "cap_email_marketing_premium",
    kinds: [K.emailSeq, K.email],
  },
  {
    id: "marketing_branding_ia",
    label: "Branding IA",
    origin: "marketing_site",
    dual_os_id: "cap_branding_premium",
    kinds: [K.brand, K.graphic],
  },
  {
    id: "marketing_social_ia",
    label: "Social Media IA",
    origin: "marketing_site",
    dual_os_id: "cap_social_media_premium",
    kinds: [K.social, K.content],
  },
  {
    id: "marketing_chatbot_ia",
    label: "Chatbot IA",
    origin: "marketing_site",
    dual_os_id: "cap_bots_premium",
    kinds: [K.chatbot],
  },
  {
    id: "marketing_automation_ia",
    label: "Automatización IA",
    origin: "marketing_site",
    dual_os_id: "cap_consultoria_automatizacion_premium",
    kinds: [K.auto, K.workflow],
  },
  {
    id: "marketing_crm_ia",
    label: "CRM IA",
    origin: "marketing_site",
    dual_os_id: "cap_advisor_empresarial_premium",
    kinds: [K.workflow, K.report],
  },
  {
    id: "marketing_landing_pages_ia",
    label: "Landing Pages IA",
    origin: "marketing_site",
    dual_os_id: "cap_landing_premium",
    kinds: [K.landing, K.funnel],
  },
  {
    id: "marketing_tiendas_online_ia",
    label: "Tiendas Online IA",
    origin: "marketing_site",
    dual_os_id: "cap_ecommerce_premium",
    kinds: [K.store, K.landing],
  },
  {
    id: "marketing_diseno_ia",
    label: "Diseño IA",
    origin: "marketing_site",
    dual_os_id: "cap_diseno_grafico_creatividades_premium",
    kinds: [K.graphic, K.brand],
  },
  {
    id: "feature_campaigns",
    label: "Campañas (panel SaaS)",
    origin: "saas_feature",
    kinds: [K.ads, K.email, K.report],
  },
  {
    id: "feature_portal",
    label: "Portal entregables cliente",
    origin: "saas_feature",
    kinds: [K.report, K.landing],
  },
];

const OS_PREMIUM_LABELS: Record<string, string> = {
  web_premium: "Web Premium",
  ecommerce_premium: "Ecommerce Premium",
  seo_premium: "SEO Premium Engine",
  ads_premium: "Ads Premium Engine",
  branding_premium: "Branding Premium",
  voz_premium: "Voz Premium",
  bots_premium: "Bots / Chatbot Engine",
  personal_digital_premium: "Personal Digital Premium",
  advisor_empresarial_premium: "Advisor Empresarial",
  canales_comunicaciones_premium: "Canales Comunicaciones",
  social_media_premium: "Social Media Engine",
  email_marketing_premium: "Email Marketing Engine",
  contenido_copywriting_premium: "Content & Copywriting Engine",
  video_multimedia_premium: "Video Multimedia",
  "3d_contenido_inmersivo_premium": "3D Inmersivo Premium",
  fotografia_producto_premium: "Fotografía Producto",
  diseno_grafico_creatividades_premium: "Diseño Gráfico Creatividades",
  consultoria_automatizacion_premium: "Automatización & Workflows",
  integraciones_apis_premium: "Integraciones APIs",
  mantenimiento_web_premium: "Mantenimiento Web",
  reputacion_online_orm_premium: "Reputación Online ORM",
  formacion_capacitacion_digital_premium: "Formación Digital",
  influencer_marketing_premium: "Influencer Marketing",
  landing_premium: "Landing Premium",
  funnel_premium: "Funnel Premium",
};

const OS_PREMIUM_KINDS: Record<string, TemplateKindName[]> = {
  web_premium: [K.web, K.landing, K.seo],
  ecommerce_premium: [K.store, K.landing, K.emailSeq],
  seo_premium: [K.seo, K.content, K.report],
  ads_premium: [K.ads, K.landing, K.video],
  branding_premium: [K.brand, K.graphic, K.content],
  voz_premium: [K.video, K.content],
  bots_premium: [K.chatbot, K.auto],
  personal_digital_premium: [K.content, K.social],
  advisor_empresarial_premium: [K.report, K.workflow],
  canales_comunicaciones_premium: [K.email, K.social, K.chatbot],
  social_media_premium: [K.social, K.content, K.ads],
  email_marketing_premium: [K.emailSeq, K.email, K.auto],
  contenido_copywriting_premium: [K.content, K.seo, K.landing],
  video_multimedia_premium: [K.video, K.ads, K.social],
  "3d_contenido_inmersivo_premium": [K.graphic, K.landing],
  fotografia_producto_premium: [K.graphic, K.store],
  diseno_grafico_creatividades_premium: [K.graphic, K.ads, K.brand],
  consultoria_automatizacion_premium: [K.auto, K.workflow],
  integraciones_apis_premium: [K.workflow],
  mantenimiento_web_premium: [K.web],
  reputacion_online_orm_premium: [K.report, K.content],
  formacion_capacitacion_digital_premium: [K.content, K.video],
  influencer_marketing_premium: [K.social, K.ads],
  landing_premium: [K.landing, K.funnel],
  funnel_premium: [K.funnel, K.landing, K.emailSeq],
};

function premiumOsCapabilities(): OsCapabilityDef[] {
  return OS_PREMIUM_SERVICE_IDS.map((id) => {
    const capId = `cap_${id}`;
    const saasDual = SAAS_SERVICES.find((s) => s.dual_os_id === capId)?.id;
    return {
      id: capId,
      label: OS_PREMIUM_LABELS[id] ?? id,
      os_premium_id: id,
      dual_saas_id: saasDual,
      kinds: OS_PREMIUM_KINDS[id] ?? [K.content, K.report],
    };
  });
}

export const OS_PLATFORM_CAPABILITIES: OsCapabilityDef[] = [
  {
    id: "cap_landing_builder",
    label: "Landing Builder (block editor)",
    dual_saas_id: "pack_growth_local",
    kinds: [K.landing, K.web],
  },
  {
    id: "cap_funnel_builder",
    label: "Funnel Builder",
    dual_saas_id: "pack_landing_funnel",
    kinds: [K.funnel, K.landing, K.workflow],
  },
  {
    id: "cap_web_builder",
    label: "Web Builder (multi-page)",
    dual_saas_id: "sku_web_corporate",
    kinds: [K.web, K.landing],
  },
  {
    id: "cap_analytics_engine",
    label: "Analytics Insights Engine",
    dual_saas_id: "pack_analytics_insights",
    kinds: [K.analytics, K.report],
  },
  {
    id: "cap_workflow_engine",
    label: "Workflow / Automation Engine",
    dual_saas_id: "sku_automation",
    kinds: [K.workflow, K.auto],
  },
  {
    id: "cap_template_factory",
    label: "Template Factory (ingest seeds)",
    kinds: [K.landing, K.email, K.graphic],
  },
  {
    id: "cap_autonomous_landing_pipeline",
    label: "Autonomous PM · Landing (NELVYON-LANDING)",
    kinds: [K.landing, K.seo, K.report],
  },
  {
    id: "cap_autonomous_seo_pipeline",
    label: "Autonomous PM · SEO (NELVYON-SEO)",
    kinds: [K.seo, K.content, K.report],
  },
  {
    id: "cap_autonomous_chatbot_pipeline",
    label: "Autonomous PM · Chatbot (NELVYON-CHATBOT)",
    kinds: [K.chatbot, K.auto],
  },
  {
    id: "cap_process_templates",
    label: "OS Process Template Registry",
    kinds: [K.workflow, K.report],
  },
  {
    id: "cap_cro_lab",
    label: "CRO Lab / Heuristics",
    dual_saas_id: "pack_cro_audit",
    kinds: [K.report, K.landing],
  },
];

const premiumCaps = premiumOsCapabilities();
const premiumIds = new Set(premiumCaps.map((c) => c.id));

export const OS_CAPABILITIES: OsCapabilityDef[] = [
  ...premiumCaps,
  ...OS_PLATFORM_CAPABILITIES.filter((p) => !premiumIds.has(p.id)),
];

export const DUAL_SERVICE_LINKS = SAAS_SERVICES.filter((s) => s.dual_os_id).map((s) => ({
  saas_id: s.id,
  os_id: s.dual_os_id!,
  saas_label: s.label,
  os_label: OS_CAPABILITIES.find((c) => c.id === s.dual_os_id)?.label ?? s.dual_os_id,
}));

export function getSaasService(id: string): SaasServiceDef | undefined {
  return SAAS_SERVICES.find((s) => s.id === id);
}

export function getOsCapability(id: string): OsCapabilityDef | undefined {
  return OS_CAPABILITIES.find((c) => c.id === id);
}

export const SAAS_SERVICE_COUNT = SAAS_SERVICES.length;
export const OS_CAPABILITY_COUNT = OS_CAPABILITIES.length;
