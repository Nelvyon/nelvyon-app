import type { FunnelStep } from "@/features/funnels/types";

import type { EliteSectorGroup, EliteTemplateCard } from "@/lib/eliteTemplates/types";

export type FunnelElitePreset = EliteTemplateCard & {
  funnelName: string;
  steps: FunnelStep[];
};

const presets: FunnelElitePreset[] = [
  {
    id: "funnel-local-capture",
    sector: "restaurant",
    sectorGroup: "local",
    label: "Local · reservas",
    tagline: "Anuncio → Landing → Reserva → CRM",
    templateId: "funnel-local-lead-v1",
    previewPath: "/funnels/builder",
    funnelName: "Captación local · Reservas",
    steps: [
      { name: "Anuncio local", exit_url: "/publicidad/google" },
      { name: "Landing", exit_url: "/dashboard/landing-pages" },
      { name: "Formulario reserva", exit_url: null },
      { name: "CRM", exit_url: "/crm/deals/new" },
    ],
  },
  {
    id: "funnel-local-dental",
    sector: "dental",
    sectorGroup: "local",
    label: "Dental · primera cita",
    tagline: "Search → Landing → Cita → Pipeline",
    templateId: "funnel-local-lead-v1",
    previewPath: "/funnels/builder",
    funnelName: "Captación clínica dental",
    steps: [
      { name: "Google Search", exit_url: "/publicidad/google" },
      { name: "Landing clínica", exit_url: "/dashboard/landing-pages" },
      { name: "Solicitud cita", exit_url: null },
      { name: "CRM", exit_url: "/crm/deals/new" },
    ],
  },
  {
    id: "funnel-ecom-purchase",
    sector: "ecommerce",
    sectorGroup: "ecommerce",
    label: "Ecommerce · compra",
    tagline: "Meta catálogo → Tienda → Checkout → CRM",
    templateId: "funnel-ecom-purchase-v1",
    previewPath: "/funnels/builder",
    funnelName: "Embudo compra ecommerce",
    steps: [
      { name: "Meta Advantage+", exit_url: "/publicidad/meta" },
      { name: "Tienda online", exit_url: "/ecommerce" },
      { name: "Checkout", exit_url: "/os/ecommerce-premium/preview/checkout" },
      { name: "CRM post-compra", exit_url: "/crm/deals" },
    ],
  },
  {
    id: "funnel-ecom-cart",
    sector: "dtc_brand",
    sectorGroup: "ecommerce",
    label: "DTC · carrito abandonado",
    tagline: "Retargeting → PDP → Email → Venta",
    templateId: "funnel-ecom-cart-recovery-v1",
    previewPath: "/funnels/builder",
    funnelName: "Recuperación carrito DTC",
    steps: [
      { name: "Retargeting Meta", exit_url: "/publicidad/meta" },
      { name: "Ficha producto", exit_url: "/ecommerce" },
      { name: "Email recuperación", exit_url: "/campaigns" },
      { name: "CRM", exit_url: "/crm/deals" },
    ],
  },
  {
    id: "funnel-saas-demo",
    sector: "saas_b2b",
    sectorGroup: "saas_b2b",
    label: "SaaS · demo request",
    tagline: "Demand gen → PLG → Demo → Pipeline",
    templateId: "funnel-ads-landing-crm-v1",
    previewPath: "/funnels/builder",
    funnelName: "Embudo demo SaaS B2B",
    steps: [
      { name: "Anuncio B2B", exit_url: "/publicidad/google" },
      { name: "Landing PLG", exit_url: "/dashboard/landing-pages" },
      { name: "Formulario demo", exit_url: null },
      { name: "Pipeline CRM", exit_url: "/crm/deals/new" },
    ],
  },
  {
    id: "funnel-saas-abm",
    sector: "fintech_b2b",
    sectorGroup: "saas_b2b",
    label: "ABM · cuentas tier 1",
    tagline: "LinkedIn → Web → Nurture → SQL",
    templateId: "funnel-b2b-abm-v1",
    previewPath: "/funnels/builder",
    funnelName: "ABM fintech B2B",
    steps: [
      { name: "LinkedIn Ads", exit_url: "/publicidad/meta" },
      { name: "Landing enterprise", exit_url: "/dashboard/landing-pages" },
      { name: "Nurture email", exit_url: "/campaigns" },
      { name: "SQL en CRM", exit_url: "/crm/deals" },
    ],
  },
];

export const FUNNEL_FEATURED_PRESET = presets.find((p) => p.id === "funnel-saas-demo")!;

export function listFunnelElitePresets(group?: EliteSectorGroup): FunnelElitePreset[] {
  if (!group) return presets;
  return presets.filter((p) => p.sectorGroup === group);
}

export function getFunnelElitePreset(id: string): FunnelElitePreset | undefined {
  return presets.find((p) => p.id === id);
}

export function buildFunnelCreatePayload(preset: FunnelElitePreset) {
  return {
    name: preset.funnelName,
    steps: preset.steps,
    status: "active",
    metadata: {
      elite_template_id: preset.templateId,
      sector: preset.sector,
      sector_group: preset.sectorGroup,
    },
  };
}
