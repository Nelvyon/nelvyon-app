import type { BusinessVertical } from "./types";
import { getAgentById } from "./agentCatalog";
import { getProcessTemplateById } from "./processTemplateRegistry";

/** Maps SaaS service pack IDs → internal OS agents + process templates. */
export type PackOsBinding = {
  packId: string;
  agentIds: string[];
  processTemplateIds: string[];
  connectorIds: string[];
  autonomousSkus?: ("NELVYON-LANDING" | "NELVYON-SEO" | "NELVYON-CHATBOT")[];
};

export const PACK_OS_BINDINGS: Record<string, PackOsBinding> = {
  "local-business-growth": {
    packId: "local-business-growth",
    agentIds: [
      "autonomous-pm-landing",
      "autonomous-pm-seo",
      "autonomous-pm-chatbot",
      "seo_premium",
      "sector-email-welcome",
      "landing_premium",
    ],
    processTemplateIds: [
      "seo-audit-local",
      "landing-local-service",
      "email-welcome-3-local",
      "deliverable-checklist-launch",
    ],
    connectorIds: ["amazon-ses", "google-search-console", "google-analytics-4"],
    autonomousSkus: ["NELVYON-LANDING", "NELVYON-SEO", "NELVYON-CHATBOT"],
  },
  "ecommerce-growth": {
    packId: "ecommerce-growth",
    agentIds: [
      "autonomous-pm-landing",
      "autonomous-pm-seo",
      "autonomous-pm-chatbot",
      "ads_premium",
      "sector-ads-meta",
      "sector-email-abandoned-cart",
    ],
    processTemplateIds: [
      "ads-meta-catalog-dtc",
      "seo-audit-ecommerce",
      "email-abandoned-cart-3",
      "landing-ecommerce-collection",
    ],
    connectorIds: ["meta-ads", "shopify", "google-analytics-4", "amazon-ses"],
    autonomousSkus: ["NELVYON-LANDING", "NELVYON-SEO", "NELVYON-CHATBOT"],
  },
  "saas-b2b-growth": {
    packId: "saas-b2b-growth",
    agentIds: [
      "autonomous-pm-landing",
      "autonomous-pm-seo",
      "autonomous-pm-chatbot",
      "sector-email-nurture",
      "sector-ads-google",
      "landing_premium",
    ],
    processTemplateIds: [
      "landing-saas-plg-trial",
      "email-nurture-5-b2b",
      "ads-google-search-b2b",
      "seo-keyword-research-b2b",
    ],
    connectorIds: ["google-ads", "google-analytics-4", "amazon-ses"],
    autonomousSkus: ["NELVYON-LANDING", "NELVYON-SEO", "NELVYON-CHATBOT"],
  },
  "seo-local-pack": {
    packId: "seo-local-pack",
    agentIds: ["seo_premium", "sector-seo-keyword-research", "sector-seo-content-optimizer"],
    processTemplateIds: ["seo-audit-local", "seo-keyword-research-local", "seo-report-monthly"],
    connectorIds: ["google-search-console", "semrush"],
  },
  "meta-ads-pack": {
    packId: "meta-ads-pack",
    agentIds: ["ads_premium", "sector-ads-meta"],
    processTemplateIds: ["ads-meta-leads-local", "ads-meta-catalog-dtc", "ads-report-weekly"],
    connectorIds: ["meta-ads", "google-analytics-4"],
  },
  "social-calendar-pack": {
    packId: "social-calendar-pack",
    agentIds: ["social_media_premium", "sector-social-calendar"],
    processTemplateIds: ["social-calendar-30d-local", "social-copy-instagram-10", "social-report-monthly"],
    connectorIds: [],
  },
  "email-welcome-nurture": {
    packId: "email-welcome-nurture",
    agentIds: ["email_marketing_premium", "sector-email-welcome", "sector-email-nurture"],
    processTemplateIds: ["email-welcome-3-local", "email-nurture-5-b2b", "email-deliverability-audit"],
    connectorIds: ["amazon-ses"],
  },
  "content-strategy-pack": {
    packId: "content-strategy-pack",
    agentIds: ["contenido_copywriting_premium", "sector-seo-keyword-research"],
    processTemplateIds: ["seo-content-plan-90d", "brand-messaging-house", "deliverable-brief-campaign"],
    connectorIds: ["google-search-console"],
  },
  "cro-audit-pack": {
    packId: "cro-audit-pack",
    agentIds: ["funnel_premium", "landing_premium"],
    processTemplateIds: ["landing-cro-audit-landing", "landing-ab-test-landing", "deliverable-action-plan-30d"],
    connectorIds: ["google-analytics-4"],
  },
  "analytics-setup-pack": {
    packId: "analytics-setup-pack",
    agentIds: ["sector-analytics-ga4"],
    processTemplateIds: ["deliverable-checklist-launch", "deliverable-report-executive"],
    connectorIds: ["google-analytics-4", "google-search-console"],
  },
  "brand-voice-pack": {
    packId: "brand-voice-pack",
    agentIds: ["branding_premium", "contenido_copywriting_premium"],
    processTemplateIds: ["brand-voice-guide", "brand-value-prop-3", "brand-persona-3"],
    connectorIds: [],
  },
  "landing-funnel-pack": {
    packId: "landing-funnel-pack",
    agentIds: ["landing_premium", "funnel_premium", "autonomous-pm-landing"],
    processTemplateIds: ["landing-funnel-map-full", "landing-lead-magnet", "landing-thank-you-upsell"],
    connectorIds: ["google-analytics-4"],
    autonomousSkus: ["NELVYON-LANDING"],
  },
};

export function getPackOsBinding(packId: string): PackOsBinding | undefined {
  return PACK_OS_BINDINGS[packId];
}

export function resolvePackOsContext(packId: string) {
  const binding = getPackOsBinding(packId);
  if (!binding) return null;
  return {
    ...binding,
    agents: binding.agentIds.map((id) => getAgentById(id)).filter(Boolean),
    templates: binding.processTemplateIds.map((id) => getProcessTemplateById(id)).filter(Boolean),
  };
}

export function getBindingsForVertical(vertical: BusinessVertical): PackOsBinding[] {
  const verticalPackMap: Record<BusinessVertical, string[]> = {
    local: ["local-business-growth", "seo-local-pack", "meta-ads-pack", "social-calendar-pack"],
    ecommerce: ["ecommerce-growth", "meta-ads-pack", "email-welcome-nurture"],
    b2b_saas: ["saas-b2b-growth", "email-welcome-nurture", "content-strategy-pack", "analytics-setup-pack"],
    info_products: ["email-welcome-nurture", "content-strategy-pack", "landing-funnel-pack", "social-calendar-pack"],
    marketplace: ["ecommerce-growth", "seo-local-pack"],
    agency: ["brand-voice-pack", "analytics-setup-pack", "cro-audit-pack"],
    generic: Object.keys(PACK_OS_BINDINGS),
  };
  const ids = verticalPackMap[vertical] ?? verticalPackMap.generic;
  return ids.map((id) => PACK_OS_BINDINGS[id]).filter(Boolean);
}
