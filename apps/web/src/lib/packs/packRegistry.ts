import type { AutonomousSku } from "../../../../../backend/autonomous/types";

import {
  ECOMMERCE_GROWTH_PACK_ID,
  ECOMMERCE_PACK_STEP_DEFINITIONS,
  LOCAL_GROWTH_PACK_ID,
  LOCAL_PACK_STEP_DEFINITIONS,
  SAAS_B2B_GROWTH_PACK_ID,
  SAAS_B2B_PACK_STEP_DEFINITIONS,
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
};

export const PACK_REGISTRY: Record<PackId, PackMeta> = {
  [LOCAL_GROWTH_PACK_ID]: {
    id: LOCAL_GROWTH_PACK_ID,
    name: "Pack Crecimiento Local",
    tagline: "Landing, SEO local y chatbot de citas para negocios de barrio",
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
  },
  [ECOMMERCE_GROWTH_PACK_ID]: {
    id: ECOMMERCE_GROWTH_PACK_ID,
    name: "Pack Crecimiento Ecommerce",
    tagline: "Tienda online, SEO de catálogo, chatbot ventas y kit Meta Ads",
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
  },
  [SAAS_B2B_GROWTH_PACK_ID]: {
    id: SAAS_B2B_GROWTH_PACK_ID,
    name: "Pack Crecimiento SaaS B2B",
    tagline: "Landing PLG, SEO demand gen, bot de demo y playbook outbound",
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
  },
};

export function getPackMeta(packId: string): PackMeta | null {
  return PACK_REGISTRY[packId as PackId] ?? null;
}

export const ALL_PACKS = Object.values(PACK_REGISTRY);
