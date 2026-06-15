import type { AdsBriefingPayload } from "@/features/publicidad/types";

import type { EliteSectorGroup, EliteTemplateCard } from "@/lib/eliteTemplates/types";

export const ADS_OS_PREVIEW = "/os/ads-premium/preview";

export type AdsElitePreset = EliteTemplateCard & {
  platforms: Array<"google" | "meta">;
  briefing: Omit<AdsBriefingPayload, "launch">;
};

const presets: AdsElitePreset[] = [
  {
    id: "ads-local-restaurant",
    sector: "restaurant",
    sectorGroup: "local",
    label: "Restaurante · Google local",
    tagline: "Search + mapas para reservas",
    templateId: "ads-google-search-local-v1",
    previewPath: ADS_OS_PREVIEW,
    platforms: ["google"],
    briefing: {
      product: "Restaurante La Plaza",
      audience: "Comensales 25–55 en Madrid, intención reserva",
      goal: "conversions",
      daily_budget_eur: 35,
      notes: "Plantilla ads-google-search-local-v1 · sector:restaurant",
    },
  },
  {
    id: "ads-local-dental",
    sector: "dental",
    sectorGroup: "local",
    label: "Clínica dental · Search",
    tagline: "Citas y primera visita",
    templateId: "ads-google-search-local-v1",
    previewPath: ADS_OS_PREVIEW,
    platforms: ["google"],
    briefing: {
      product: "Clínica Dental Norte",
      audience: "Familias y adultos 30–55 en zona urbana",
      goal: "leads",
      daily_budget_eur: 45,
      notes: "Plantilla ads-google-search-local-v1 · sector:dental",
    },
  },
  {
    id: "ads-local-fitness",
    sector: "fitness",
    sectorGroup: "local",
    label: "Gimnasio · Meta + Google",
    tagline: "Prueba gratuita y membresía",
    templateId: "ads-meta-local-awareness-v1",
    previewPath: ADS_OS_PREVIEW,
    platforms: ["google", "meta"],
    briefing: {
      product: "FitZone Centro",
      audience: "Adultos 22–40 interesados en fitness cerca del gimnasio",
      goal: "conversions",
      daily_budget_eur: 40,
      notes: "Plantilla ads-meta-local-awareness-v1 · sector:fitness",
    },
  },
  {
    id: "ads-local-real-estate",
    sector: "real_estate",
    sectorGroup: "local",
    label: "Inmobiliaria · captación",
    tagline: "Valoraciones y visitas",
    templateId: "ads-google-search-local-v1",
    previewPath: ADS_OS_PREVIEW,
    platforms: ["google"],
    briefing: {
      product: "Inmobiliaria Horizonte",
      audience: "Compradores y vendedores en la provincia",
      goal: "leads",
      daily_budget_eur: 55,
      notes: "Plantilla ads-google-search-local-v1 · sector:real_estate",
    },
  },
  {
    id: "ads-ecom-meta-advantage",
    sector: "ecommerce",
    sectorGroup: "ecommerce",
    label: "Ecommerce · Meta Advantage+",
    tagline: "Catálogo + retargeting (pack Ecommerce)",
    templateId: "ads-meta-advantage-ecom-v1",
    previewPath: ADS_OS_PREVIEW,
    platforms: ["meta"],
    briefing: {
      product: "Moda Nova",
      audience: "Compradores moda femenina 25–45, España",
      goal: "conversions",
      daily_budget_eur: 65,
      notes: "Plantilla ads-meta-advantage-ecom-v1 · sector:ecommerce",
    },
  },
  {
    id: "ads-ecom-google-shopping",
    sector: "dtc_brand",
    sectorGroup: "ecommerce",
    label: "Marca DTC · Google Shopping",
    tagline: "PLA + remarketing carrito",
    templateId: "ads-google-shopping-ecom-v1",
    previewPath: ADS_OS_PREVIEW,
    platforms: ["google", "meta"],
    briefing: {
      product: "Marca DTC Premium",
      audience: "Compradores online con AOV >70€",
      goal: "conversions",
      daily_budget_eur: 70,
      notes: "Plantilla ads-google-shopping-ecom-v1 · sector:dtc_brand",
    },
  },
  {
    id: "ads-ecom-marketplace",
    sector: "marketplace",
    sectorGroup: "ecommerce",
    label: "Marketplace · multicanal",
    tagline: "Prospecting + retargeting 7d",
    templateId: "ads-meta-advantage-ecom-v1",
    previewPath: ADS_OS_PREVIEW,
    platforms: ["meta", "google"],
    briefing: {
      product: "Marketplace MultiMarca",
      audience: "Visitantes con intención de compra multimarca",
      goal: "conversions",
      daily_budget_eur: 80,
      notes: "Plantilla ads-meta-advantage-ecom-v1 · sector:marketplace",
    },
  },
  {
    id: "ads-saas-demand-gen",
    sector: "saas_b2b",
    sectorGroup: "saas_b2b",
    label: "SaaS B2B · demand gen",
    tagline: "LinkedIn + Search demos",
    templateId: "ads-google-demand-b2b-v1",
    previewPath: ADS_OS_PREVIEW,
    platforms: ["google"],
    briefing: {
      product: "FlowMetrics",
      audience: "VP Product y Head of Growth en SaaS 50–200 empleados",
      goal: "leads",
      daily_budget_eur: 90,
      notes: "Plantilla ads-google-demand-b2b-v1 · sector:saas_b2b",
    },
  },
  {
    id: "ads-saas-devtools",
    sector: "devtools",
    sectorGroup: "saas_b2b",
    label: "DevTools · PLG + ads",
    tagline: "Trial signup y activación",
    templateId: "ads-google-demand-b2b-v1",
    previewPath: ADS_OS_PREVIEW,
    platforms: ["google", "meta"],
    briefing: {
      product: "DevStack Cloud",
      audience: "Engineering managers y platform teams",
      goal: "conversions",
      daily_budget_eur: 75,
      notes: "Plantilla ads-google-demand-b2b-v1 · sector:devtools",
    },
  },
  {
    id: "ads-saas-fintech",
    sector: "fintech_b2b",
    sectorGroup: "saas_b2b",
    label: "Fintech B2B · compliance-safe",
    tagline: "Demo request cualificado",
    templateId: "ads-google-demand-b2b-v1",
    previewPath: ADS_OS_PREVIEW,
    platforms: ["google"],
    briefing: {
      product: "PayLedger B2B",
      audience: "CFO y heads of finance en mid-market",
      goal: "leads",
      daily_budget_eur: 100,
      notes: "Plantilla ads-google-demand-b2b-v1 · sector:fintech_b2b",
    },
  },
];

export const ADS_FEATURED_PRESET = presets.find((p) => p.id === "ads-ecom-meta-advantage")!;

export function listAdsElitePresets(group?: EliteSectorGroup): AdsElitePreset[] {
  if (!group) return presets;
  return presets.filter((p) => p.sectorGroup === group);
}

export function getAdsElitePreset(id: string): AdsElitePreset | undefined {
  return presets.find((p) => p.id === id);
}

export function buildAdsBriefingFromPreset(
  preset: AdsElitePreset,
  launch = true,
): AdsBriefingPayload {
  return { ...preset.briefing, launch };
}
