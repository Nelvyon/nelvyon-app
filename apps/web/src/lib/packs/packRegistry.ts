import type { AutonomousSku } from "../../../../../backend/autonomous/types";

import { getPackOsBinding } from "@/lib/os-core/packOsBridge";
import {
  ECOMMERCE_GROWTH_PACK_ID,
  ECOMMERCE_PACK_STEP_DEFINITIONS,
  LOCAL_GROWTH_PACK_ID,
  LOCAL_PACK_STEP_DEFINITIONS,
  SAAS_B2B_GROWTH_PACK_ID,
  SAAS_B2B_PACK_STEP_DEFINITIONS,
  SOCIAL_CALENDAR_PACK_ID,
  SOCIAL_CALENDAR_PACK_STEP_DEFINITIONS,
  CONTENT_STRATEGY_PACK_ID,
  CONTENT_STRATEGY_PACK_STEP_DEFINITIONS,
  CRO_AUDIT_PACK_ID,
  CRO_AUDIT_PACK_STEP_DEFINITIONS,
  ANALYTICS_SETUP_PACK_ID,
  ANALYTICS_SETUP_PACK_STEP_DEFINITIONS,
  BRAND_VOICE_PACK_ID,
  BRAND_VOICE_PACK_STEP_DEFINITIONS,
  type PackId,
} from "@/lib/packs/types";

export type PackMeta = {
  id: PackId;
  name: string;
  tagline: string;
  accent: string;
  kickoffPath: string;
  reportPath: string;
  projectPrefix: string;
  stepDefinitions: { key: string; label: string }[];
  skuSequence: AutonomousSku[];
  sectors: { id: string; label: string }[];
  /** Internal OS wiring (not shown to end users in SaaS UI). */
  osAgentIds: string[];
  osProcessTemplateIds: string[];
  osConnectorIds: string[];
};
export const PACK_REGISTRY: Record<PackId, PackMeta> = {
  [LOCAL_GROWTH_PACK_ID]: {
    id: LOCAL_GROWTH_PACK_ID,
    name: "Crecimiento Local",
    tagline: "Aparece en Google en tu ciudad y convierte visitas en citas o reservas",
    accent: "from-emerald-500/10 via-card to-card",
    kickoffPath: "/os/packs/local-growth",
    reportPath: "/dashboard/local-growth",
    projectPrefix: "LGP",
    stepDefinitions: LOCAL_PACK_STEP_DEFINITIONS,
    skuSequence: ["NELVYON-LANDING", "NELVYON-SEO", "NELVYON-CHATBOT"],
    sectors: [
      { id: "restaurant", label: "Restaurante / hostelería" },
      { id: "dental", label: "Clínica dental" },
      { id: "fitness", label: "Gimnasio / fitness" },
      { id: "beauty", label: "Belleza / estética" },
      { id: "real_estate", label: "Inmobiliaria" },
      { id: "coaching", label: "Coaching / formación" },
    ],
    ...pickOsFields(LOCAL_GROWTH_PACK_ID),
  },
  [ECOMMERCE_GROWTH_PACK_ID]: {
    id: ECOMMERCE_GROWTH_PACK_ID,
    name: "Crecimiento Ecommerce",
    tagline: "Tienda que vende, catálogo en Google y retargeting en Meta",
    accent: "from-violet-500/10 via-card to-card",
    kickoffPath: "/os/packs/ecommerce-growth",
    reportPath: "/dashboard/ecommerce-growth",
    projectPrefix: "EGP",
    stepDefinitions: ECOMMERCE_PACK_STEP_DEFINITIONS,
    skuSequence: ["NELVYON-LANDING", "NELVYON-SEO", "NELVYON-CHATBOT"],
    sectors: [
      { id: "ecommerce", label: "Ecommerce general" },
      { id: "marketplace", label: "Marketplace / multimarca" },
      { id: "dtc_brand", label: "Marca DTC" },
    ],
    ...pickOsFields(ECOMMERCE_GROWTH_PACK_ID),
  },
  [SAAS_B2B_GROWTH_PACK_ID]: {
    id: SAAS_B2B_GROWTH_PACK_ID,
    name: "Crecimiento SaaS B2B",
    tagline: "Pipeline de demos con landing PLG, SEO y nurture automático",
    accent: "from-sky-500/10 via-card to-card",
    kickoffPath: "/os/packs/saas-b2b-growth",
    reportPath: "/dashboard/saas-b2b-growth",
    projectPrefix: "SGP",
    stepDefinitions: SAAS_B2B_PACK_STEP_DEFINITIONS,
    skuSequence: ["NELVYON-LANDING", "NELVYON-SEO", "NELVYON-CHATBOT"],
    sectors: [
      { id: "saas_b2b", label: "SaaS B2B general" },
      { id: "devtools", label: "DevTools / infra" },
      { id: "fintech_b2b", label: "Fintech B2B" },
    ],
    ...pickOsFields(SAAS_B2B_GROWTH_PACK_ID),
  },
  [SOCIAL_CALENDAR_PACK_ID]: {
    id: SOCIAL_CALENDAR_PACK_ID,
    name: "Calendario Social",
    tagline: "30 días de contenido social calibrado para tu sector y audiencia",
    accent: "from-pink-500/10 via-card to-card",
    kickoffPath: "/os/packs/social-calendar",
    reportPath: "/dashboard/social-calendar",
    projectPrefix: "SCP",
    stepDefinitions: SOCIAL_CALENDAR_PACK_STEP_DEFINITIONS,
    skuSequence: ["NELVYON-LANDING", "NELVYON-CHATBOT"],
    sectors: [
      { id: "local", label: "Negocio local" },
      { id: "ecommerce", label: "Ecommerce" },
      { id: "saas_b2b", label: "SaaS B2B" },
    ],
    ...pickOsFields(SOCIAL_CALENDAR_PACK_ID),
  },
  [CONTENT_STRATEGY_PACK_ID]: {
    id: CONTENT_STRATEGY_PACK_ID,
    name: "Estrategia de Contenido",
    tagline: "Plan editorial 90 días + mensajes de marca y keywords prioritarios",
    accent: "from-orange-500/10 via-card to-card",
    kickoffPath: "/os/packs/content-strategy",
    reportPath: "/dashboard/content-strategy",
    projectPrefix: "CSP",
    stepDefinitions: CONTENT_STRATEGY_PACK_STEP_DEFINITIONS,
    skuSequence: ["NELVYON-LANDING", "NELVYON-SEO"],
    sectors: [
      { id: "local", label: "Negocio local" },
      { id: "ecommerce", label: "Ecommerce" },
      { id: "saas_b2b", label: "SaaS B2B" },
    ],
    ...pickOsFields(CONTENT_STRATEGY_PACK_ID),
  },
  [CRO_AUDIT_PACK_ID]: {
    id: CRO_AUDIT_PACK_ID,
    name: "Auditoría CRO",
    tagline: "Auditoría de landing y funnel con plan A/B test de 30 días",
    accent: "from-red-500/10 via-card to-card",
    kickoffPath: "/os/packs/cro-audit",
    reportPath: "/dashboard/cro-audit",
    projectPrefix: "CAP",
    stepDefinitions: CRO_AUDIT_PACK_STEP_DEFINITIONS,
    skuSequence: ["NELVYON-LANDING", "NELVYON-SEO"],
    sectors: [
      { id: "ecommerce", label: "Ecommerce" },
      { id: "saas_b2b", label: "SaaS B2B" },
      { id: "local", label: "Negocio local" },
    ],
    ...pickOsFields(CRO_AUDIT_PACK_ID),
  },
  [ANALYTICS_SETUP_PACK_ID]: {
    id: ANALYTICS_SETUP_PACK_ID,
    name: "Setup Analytics",
    tagline: "GA4 + Search Console configurados y dashboard ejecutivo listo en 48h",
    accent: "from-cyan-500/10 via-card to-card",
    kickoffPath: "/os/packs/analytics-setup",
    reportPath: "/dashboard/analytics-setup",
    projectPrefix: "ASP",
    stepDefinitions: ANALYTICS_SETUP_PACK_STEP_DEFINITIONS,
    skuSequence: ["NELVYON-SEO", "NELVYON-LANDING"],
    sectors: [
      { id: "ecommerce", label: "Ecommerce" },
      { id: "saas_b2b", label: "SaaS B2B" },
      { id: "local", label: "Negocio local" },
    ],
    ...pickOsFields(ANALYTICS_SETUP_PACK_ID),
  },
  [BRAND_VOICE_PACK_ID]: {
    id: BRAND_VOICE_PACK_ID,
    name: "Voz de Marca",
    tagline: "Guía de voz, propuestas de valor y 3 arquetipos de cliente ideal",
    accent: "from-amber-500/10 via-card to-card",
    kickoffPath: "/os/packs/brand-voice",
    reportPath: "/dashboard/brand-voice",
    projectPrefix: "BVP",
    stepDefinitions: BRAND_VOICE_PACK_STEP_DEFINITIONS,
    skuSequence: ["NELVYON-LANDING", "NELVYON-CHATBOT"],
    sectors: [
      { id: "local", label: "Negocio local" },
      { id: "ecommerce", label: "Ecommerce" },
      { id: "saas_b2b", label: "SaaS B2B" },
    ],
    ...pickOsFields(BRAND_VOICE_PACK_ID),
  },
};

function pickOsFields(packId: PackId) {
  const b = getPackOsBinding(packId);
  return {
    osAgentIds: b?.agentIds ?? [],
    osProcessTemplateIds: b?.processTemplateIds ?? [],
    osConnectorIds: b?.connectorIds ?? [],
  };
}
/** Public aliases for kickoff routes (legacy docs / service catalog slugs). */
export const PACK_ID_ALIASES: Record<string, PackId> = {
  "analytics-insights": ANALYTICS_SETUP_PACK_ID,
  "analytics-insights-pack": ANALYTICS_SETUP_PACK_ID,
};

export function resolvePackId(packId: string): PackId | null {
  const resolved = (PACK_ID_ALIASES[packId] ?? packId) as PackId;
  return PACK_REGISTRY[resolved] ? resolved : null;
}

export function getPackMeta(packId: string): PackMeta | null {
  const resolved = resolvePackId(packId);
  return resolved ? PACK_REGISTRY[resolved] : null;
}

export const ALL_PACKS = Object.values(PACK_REGISTRY);
