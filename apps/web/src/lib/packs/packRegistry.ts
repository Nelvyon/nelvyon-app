import type { AutonomousSku } from "../../../../../backend/autonomous/types";

import { getPackOsBinding } from "@/lib/os-core/packOsBridge";
import { SERVICE_PACK_CATALOG } from "@/lib/saas/servicePacksCatalog";
import {
  ECOMMERCE_GROWTH_PACK_ID,
  ECOMMERCE_PACK_STEP_DEFINITIONS,
  LOCAL_GROWTH_PACK_ID,
  LOCAL_PACK_STEP_DEFINITIONS,
  SAAS_B2B_GROWTH_PACK_ID,
  SAAS_B2B_PACK_STEP_DEFINITIONS,
  SOCIAL_CALENDAR_PACK_ID,
  CONTENT_STRATEGY_PACK_ID,
  CRO_AUDIT_PACK_ID,
  ANALYTICS_SETUP_PACK_ID,
  BRAND_VOICE_PACK_ID,
  STRATEGY_PACK_ID,
  FUNNEL_GROWTH_PACK_ID,
  RETENTION_PACK_ID,
  AUTOMATIONS_OPS_PACK_ID,
  REPUTATION_OPS_PACK_ID,
  INFLUENCERS_PR_PACK_ID,
  STRATEGY_PACK_STEP_DEFINITIONS,
  FUNNEL_GROWTH_PACK_STEP_DEFINITIONS,
  RETENTION_PACK_STEP_DEFINITIONS,
  SOCIAL_CALENDAR_PACK_STEP_DEFINITIONS,
  CONTENT_STRATEGY_PACK_STEP_DEFINITIONS,
  CRO_AUDIT_PACK_STEP_DEFINITIONS,
  ANALYTICS_SETUP_PACK_STEP_DEFINITIONS,
  BRAND_VOICE_PACK_STEP_DEFINITIONS,
  AUTOMATIONS_OPS_PACK_STEP_DEFINITIONS,
  REPUTATION_OPS_PACK_STEP_DEFINITIONS,
  INFLUENCERS_PR_PACK_STEP_DEFINITIONS,
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
    reportPath: "/os/packs/local-growth/report",
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
    reportPath: "/os/packs/ecommerce-growth/report",
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
    reportPath: "/os/packs/saas-b2b-growth/report",
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
    reportPath: "/os/packs/social-calendar/report",
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
    reportPath: "/os/packs/content-strategy/report",
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
    reportPath: "/os/packs/cro-audit/report",
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
    reportPath: "/os/packs/analytics-setup/report",
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
    reportPath: "/os/packs/brand-voice/report",
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
  [STRATEGY_PACK_ID]: {
    id: STRATEGY_PACK_ID,
    name: "Strategy OS",
    tagline: "Plan estratégico 90 días con OKRs y packs sugeridos",
    accent: "from-indigo-500/10 via-card to-card",
    kickoffPath: "/os/packs/strategy",
    reportPath: "/os/packs/strategy/report",
    projectPrefix: "STP",
    stepDefinitions: STRATEGY_PACK_STEP_DEFINITIONS,
    skuSequence: ["NELVYON-LANDING"],
    sectors: [
      { id: "local", label: "Negocio local" },
      { id: "ecommerce", label: "Ecommerce" },
      { id: "saas_b2b", label: "SaaS B2B" },
    ],
    ...pickOsFields(STRATEGY_PACK_ID),
  },
  [FUNNEL_GROWTH_PACK_ID]: {
    id: FUNNEL_GROWTH_PACK_ID,
    name: "Funnel OS",
    tagline: "Funnel multi-step con mapa CRO, copy y eventos de tracking",
    accent: "from-fuchsia-500/10 via-card to-card",
    kickoffPath: "/os/packs/funnel-growth",
    reportPath: "/os/packs/funnel-growth/report",
    projectPrefix: "FGP",
    stepDefinitions: FUNNEL_GROWTH_PACK_STEP_DEFINITIONS,
    skuSequence: ["NELVYON-LANDING", "NELVYON-SEO"],
    sectors: [
      { id: "ecommerce", label: "Ecommerce" },
      { id: "saas_b2b", label: "SaaS B2B" },
      { id: "local", label: "Negocio local" },
    ],
    ...pickOsFields(FUNNEL_GROWTH_PACK_ID),
  },
  [RETENTION_PACK_ID]: {
    id: RETENTION_PACK_ID,
    name: "Retention OS",
    tagline: "Secuencia de retención, reglas de churn y cohort CRM",
    accent: "from-teal-500/10 via-card to-card",
    kickoffPath: "/os/packs/retention",
    reportPath: "/os/packs/retention/report",
    projectPrefix: "RTP",
    stepDefinitions: RETENTION_PACK_STEP_DEFINITIONS,
    skuSequence: ["NELVYON-CHATBOT"],
    sectors: [
      { id: "saas_b2b", label: "SaaS B2B" },
      { id: "ecommerce", label: "Ecommerce" },
      { id: "local", label: "Negocio local" },
    ],
    ...pickOsFields(RETENTION_PACK_ID),
  },
  [AUTOMATIONS_OPS_PACK_ID]: {
    id: AUTOMATIONS_OPS_PACK_ID,
    name: "Automatizaciones OS",
    tagline: "Mapa de workflows, playbook de triggers y automatización CRM lista para operar",
    accent: "from-lime-500/10 via-card to-card",
    kickoffPath: "/os/packs/automations-ops",
    reportPath: "/os/packs/automations-ops/report",
    projectPrefix: "AOP",
    stepDefinitions: AUTOMATIONS_OPS_PACK_STEP_DEFINITIONS,
    skuSequence: ["NELVYON-CHATBOT"],
    sectors: [
      { id: "local", label: "Negocio local" },
      { id: "ecommerce", label: "Ecommerce" },
      { id: "saas_b2b", label: "SaaS B2B" },
    ],
    ...pickOsFields(AUTOMATIONS_OPS_PACK_ID),
  },
  [REPUTATION_OPS_PACK_ID]: {
    id: REPUTATION_OPS_PACK_ID,
    name: "Reputación OS",
    tagline: "Monitorización de reseñas, plantillas de respuesta y plan de recuperación de reputación",
    accent: "from-rose-500/10 via-card to-card",
    kickoffPath: "/os/packs/reputation-ops",
    reportPath: "/os/packs/reputation-ops/report",
    projectPrefix: "ROP",
    stepDefinitions: REPUTATION_OPS_PACK_STEP_DEFINITIONS,
    skuSequence: ["NELVYON-CHATBOT"],
    sectors: [
      { id: "local", label: "Negocio local" },
      { id: "ecommerce", label: "Ecommerce" },
      { id: "saas_b2b", label: "SaaS B2B" },
    ],
    ...pickOsFields(REPUTATION_OPS_PACK_ID),
  },
  [INFLUENCERS_PR_PACK_ID]: {
    id: INFLUENCERS_PR_PACK_ID,
    name: "Influencers / PR OS",
    tagline: "Research de creadores, scoring, brief de outreach y checklist de contrato — sin envío real",
    accent: "from-purple-500/10 via-card to-card",
    kickoffPath: "/os/packs/influencers-pr",
    reportPath: "/os/packs/influencers-pr/report",
    projectPrefix: "IPP",
    stepDefinitions: INFLUENCERS_PR_PACK_STEP_DEFINITIONS,
    skuSequence: ["NELVYON-CHATBOT"],
    sectors: [
      { id: "local", label: "Negocio local" },
      { id: "ecommerce", label: "Ecommerce" },
      { id: "saas_b2b", label: "SaaS B2B" },
    ],
    ...pickOsFields(INFLUENCERS_PR_PACK_ID),
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

/** Maps SaaS catalog satellite SKUs (seo-local-pack, etc.) to runnable pack ids. */
export function resolveKickoffPackId(packId: string): PackId | null {
  const fromRegistry = resolvePackId(packId);
  if (fromRegistry) return fromRegistry;
  const catalog = SERVICE_PACK_CATALOG.find((p) => p.id === packId);
  if (catalog?.launchPackId) return catalog.launchPackId;
  return null;
}

export function getPackMeta(packId: string): PackMeta | null {
  const resolved = resolveKickoffPackId(packId);
  return resolved ? PACK_REGISTRY[resolved] : null;
}

export const ALL_PACKS = Object.values(PACK_REGISTRY);
