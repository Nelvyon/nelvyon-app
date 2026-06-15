import {
  ECOMMERCE_GROWTH_PACK_ID,
  LOCAL_GROWTH_PACK_ID,
  SAAS_B2B_GROWTH_PACK_ID,
  type PackId,
} from "@/lib/packs/types";

/** Template IDs aligned with `backend/autonomous/templates/registry.json` + OS premium previews. */
export type PackEliteTemplateBundle = {
  landing_template_id: string;
  seo_template_id: string;
  chatbot_flow_template_id: string;
  email_template_id: string;
  ads_template_id?: string;
  funnel_template_id?: string;
  preview_paths: {
    landing: string;
    seo: string;
    chatbot: string;
    email: string;
    ads?: string;
    store?: string;
    funnel?: string;
  };
};

export type PackElitePreset = {
  id: string;
  label: string;
  sector: string;
  tagline: string;
  intake: Record<string, unknown>;
  templates: PackEliteTemplateBundle;
};

const OS = {
  landing: "/os/web-premium/preview",
  seo: "/os/seo-premium/preview",
  chatbot: "/os/bots-premium/preview",
  email: "/os/email-marketing-premium/preview",
  ads: "/os/ads-premium/preview",
  store: "/os/ecommerce-premium/preview",
  funnel: "/funnels/builder",
} as const;

const SECTOR_TEMPLATES: Record<string, PackEliteTemplateBundle> = {
  restaurant: {
    landing_template_id: "landing-cro-v3",
    seo_template_id: "seo-premium-local-v1",
    chatbot_flow_template_id: "chatbot-faq-restaurant-v1",
    email_template_id: "email-welcome-local-v1",
    preview_paths: { landing: OS.landing, seo: OS.seo, chatbot: OS.chatbot, email: OS.email },
  },
  dental: {
    landing_template_id: "landing-hero-split",
    seo_template_id: "seo-premium-local-v1",
    chatbot_flow_template_id: "chatbot-appointment-v1",
    email_template_id: "email-welcome-local-v1",
    preview_paths: { landing: OS.landing, seo: OS.seo, chatbot: OS.chatbot, email: OS.email },
  },
  fitness: {
    landing_template_id: "landing-video-cta",
    seo_template_id: "seo-premium-local-v1",
    chatbot_flow_template_id: "chatbot-lead-capture-v1",
    email_template_id: "email-welcome-local-v1",
    preview_paths: { landing: OS.landing, seo: OS.seo, chatbot: OS.chatbot, email: OS.email },
  },
  beauty: {
    landing_template_id: "landing-hero-split",
    seo_template_id: "seo-premium-local-v1",
    chatbot_flow_template_id: "chatbot-lead-capture-v1",
    email_template_id: "email-welcome-local-v1",
    preview_paths: { landing: OS.landing, seo: OS.seo, chatbot: OS.chatbot, email: OS.email },
  },
  real_estate: {
    landing_template_id: "landing-form-long",
    seo_template_id: "seo-premium-local-v1",
    chatbot_flow_template_id: "chatbot-lead-capture-v1",
    email_template_id: "email-welcome-local-v1",
    preview_paths: { landing: OS.landing, seo: OS.seo, chatbot: OS.chatbot, email: OS.email },
  },
  coaching: {
    landing_template_id: "landing-video-cta",
    seo_template_id: "seo-premium-local-v1",
    chatbot_flow_template_id: "chatbot-lead-capture-v1",
    email_template_id: "email-welcome-local-v1",
    preview_paths: { landing: OS.landing, seo: OS.seo, chatbot: OS.chatbot, email: OS.email },
  },
  ecommerce: {
    landing_template_id: "landing-catalog-bridge",
    seo_template_id: "seo-premium-ecom-v1",
    chatbot_flow_template_id: "chatbot-ecommerce-support-v1",
    email_template_id: "email-welcome-ecom-v1",
    ads_template_id: "ads-meta-advantage-ecom-v1",
    preview_paths: {
      landing: OS.store,
      seo: OS.seo,
      chatbot: OS.chatbot,
      email: OS.email,
      ads: OS.ads,
      store: OS.store,
    },
  },
  marketplace: {
    landing_template_id: "landing-catalog-bridge",
    seo_template_id: "seo-premium-ecom-v1",
    chatbot_flow_template_id: "chatbot-ecommerce-support-v1",
    email_template_id: "email-welcome-ecom-v1",
    ads_template_id: "ads-meta-advantage-ecom-v1",
    preview_paths: {
      landing: OS.store,
      seo: OS.seo,
      chatbot: OS.chatbot,
      email: OS.email,
      ads: OS.ads,
      store: OS.store,
    },
  },
  dtc_brand: {
    landing_template_id: "landing-catalog-bridge",
    seo_template_id: "seo-premium-ecom-v1",
    chatbot_flow_template_id: "chatbot-ecommerce-support-v1",
    email_template_id: "email-cart-abandon-v1",
    ads_template_id: "ads-meta-advantage-ecom-v1",
    preview_paths: {
      landing: OS.store,
      seo: OS.seo,
      chatbot: OS.chatbot,
      email: OS.email,
      ads: OS.ads,
      store: OS.store,
    },
  },
  saas_b2b: {
    landing_template_id: "landing-saas-trial",
    seo_template_id: "seo-premium-demand-v1",
    chatbot_flow_template_id: "chatbot-b2b-qualify-v1",
    email_template_id: "email-nurture-b2b-v1",
    funnel_template_id: "funnel-ads-landing-crm-v1",
    preview_paths: {
      landing: OS.landing,
      seo: OS.seo,
      chatbot: OS.chatbot,
      email: OS.email,
      funnel: OS.funnel,
    },
  },
  devtools: {
    landing_template_id: "landing-saas-trial",
    seo_template_id: "seo-premium-demand-v1",
    chatbot_flow_template_id: "chatbot-b2b-qualify-v1",
    email_template_id: "email-nurture-b2b-v1",
    funnel_template_id: "funnel-ads-landing-crm-v1",
    preview_paths: {
      landing: OS.landing,
      seo: OS.seo,
      chatbot: OS.chatbot,
      email: OS.email,
      funnel: OS.funnel,
    },
  },
  fintech_b2b: {
    landing_template_id: "web-proactiv",
    seo_template_id: "seo-premium-demand-v1",
    chatbot_flow_template_id: "chatbot-b2b-qualify-v1",
    email_template_id: "email-nurture-b2b-v1",
    funnel_template_id: "funnel-ads-landing-crm-v1",
    preview_paths: {
      landing: OS.landing,
      seo: OS.seo,
      chatbot: OS.chatbot,
      email: OS.email,
      funnel: OS.funnel,
    },
  },
};

const FEATURED: Record<PackId, PackElitePreset> = {
  [LOCAL_GROWTH_PACK_ID]: {
    id: "local-restaurant-demo",
    label: "Restaurante La Plaza",
    sector: "restaurant",
    tagline: "Hostelería · Madrid · reservas online",
    intake: {
      business_name: "Restaurante La Plaza",
      sector: "restaurant",
      city: "Madrid",
      country: "ES",
      value_proposition: "Cocina mediterránea de autor con producto de kilómetro cero",
      primary_cta: "Reservar mesa",
      contact_email: "reservas@laplaza-demo.es",
      tier: "professional",
    },
    templates: SECTOR_TEMPLATES.restaurant,
  },
  [ECOMMERCE_GROWTH_PACK_ID]: {
    id: "ecom-moda-demo",
    label: "Moda Nova",
    sector: "ecommerce",
    tagline: "Moda DTC · Barcelona · Meta Ads + carrito",
    intake: {
      business_name: "Moda Nova",
      sector: "ecommerce",
      city: "Barcelona",
      country: "ES",
      value_proposition: "Moda sostenible premium con envío 48h en península",
      primary_cta: "Comprar ahora",
      product_category: "Moda femenina",
      avg_order_value: "89",
      primary_channel: "meta",
      contact_email: "hola@modanova-demo.es",
      tier: "professional",
    },
    templates: SECTOR_TEMPLATES.ecommerce,
  },
  [SAAS_B2B_GROWTH_PACK_ID]: {
    id: "saas-flowmetrics-demo",
    label: "FlowMetrics",
    sector: "saas_b2b",
    tagline: "SaaS B2B · Madrid · demo + outbound",
    intake: {
      business_name: "FlowMetrics",
      sector: "saas_b2b",
      city: "Madrid",
      country: "ES",
      value_proposition: "Analytics de producto en tiempo real para equipos SaaS",
      primary_cta: "Solicitar demo",
      icp_title: "VP Product en SaaS B2B (50–200 empleados)",
      pricing_model: "subscription",
      sales_motion: "hybrid",
      contact_email: "demo@flowmetrics-demo.es",
      tier: "professional",
    },
    templates: SECTOR_TEMPLATES.saas_b2b,
  },
};

export function getPackFeaturedPreset(packId: PackId): PackElitePreset {
  return FEATURED[packId];
}

export function getPackSectorPreset(packId: PackId, sector: string): PackElitePreset | null {
  const bundle = SECTOR_TEMPLATES[sector];
  if (!bundle) return null;
  const featured = FEATURED[packId];
  const sectorLabel =
    featured.intake.sector === sector
      ? featured.label
      : `${featured.label.split(" ")[0]} · ${sector}`;
  return {
    id: `${packId}-${sector}`,
    label: sectorLabel,
    sector,
    tagline: `Plantilla élite · ${sector}`,
    intake: { ...featured.intake, sector },
    templates: bundle,
  };
}

export function listPackSectorPresets(packId: PackId, sectorIds: string[]): PackElitePreset[] {
  return sectorIds
    .map((s) => getPackSectorPreset(packId, s))
    .filter((p): p is PackElitePreset => p !== null);
}

export function applyEliteTemplatesToBrief(
  brief: Record<string, unknown>,
  templates: PackEliteTemplateBundle,
): Record<string, unknown> {
  return {
    ...brief,
    elite_templates: {
      landing_template_id: templates.landing_template_id,
      seo_template_id: templates.seo_template_id,
      chatbot_flow_template_id: templates.chatbot_flow_template_id,
      email_template_id: templates.email_template_id,
      ads_template_id: templates.ads_template_id ?? null,
      funnel_template_id: templates.funnel_template_id ?? null,
      preview_paths: templates.preview_paths,
    },
    template_id: templates.landing_template_id,
    flow_template_id: templates.chatbot_flow_template_id,
  };
}

export function resolveTemplatesForSector(sector: string): PackEliteTemplateBundle {
  return (
    SECTOR_TEMPLATES[sector] ?? {
      landing_template_id: "landing-cro-v3",
      seo_template_id: "seo-premium-local-v1",
      chatbot_flow_template_id: "chatbot-lead-capture-v1",
      email_template_id: "email-welcome-local-v1",
      preview_paths: {
        landing: OS.landing,
        seo: OS.seo,
        chatbot: OS.chatbot,
        email: OS.email,
      },
    }
  );
}

export type PackTemplateGalleryItem = {
  key: string;
  title: string;
  description: string;
  previewPath: string;
};

export function getPackTemplateGallery(packId: PackId): PackTemplateGalleryItem[] {
  const preset = FEATURED[packId];
  const t = preset.templates;
  const items: PackTemplateGalleryItem[] = [
    {
      key: "landing",
      title: packId === ECOMMERCE_GROWTH_PACK_ID ? "Tienda / landing" : "Landing web",
      description: `Plantilla ${t.landing_template_id}`,
      previewPath: t.preview_paths.store ?? t.preview_paths.landing,
    },
    {
      key: "seo",
      title: "Auditoría SEO",
      description: `Plantilla ${t.seo_template_id}`,
      previewPath: t.preview_paths.seo,
    },
    {
      key: "chatbot",
      title: "Chatbot",
      description: `Flujo ${t.chatbot_flow_template_id}`,
      previewPath: t.preview_paths.chatbot,
    },
    {
      key: "email",
      title: "Email marketing",
      description: `Secuencia ${t.email_template_id}`,
      previewPath: t.preview_paths.email,
    },
  ];
  if (t.ads_template_id && t.preview_paths.ads) {
    items.push({
      key: "ads",
      title: "Kit publicidad",
      description: `Plantilla ${t.ads_template_id}`,
      previewPath: t.preview_paths.ads,
    });
  }
  if (t.funnel_template_id && t.preview_paths.funnel) {
    items.push({
      key: "funnel",
      title: "Embudo de conversión",
      description: `Plantilla ${t.funnel_template_id}`,
      previewPath: t.preview_paths.funnel,
    });
  }
  return items;
}
