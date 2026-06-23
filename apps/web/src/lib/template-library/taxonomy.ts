import type { TemplateSector, TemplateService, TemplateVertical } from "./types";

/** Maps each marketing service to template kinds clients expect. */
export const SERVICE_TEMPLATE_MATRIX: Record<
  TemplateService,
  { kinds: string[]; description: string }
> = {
  seo: {
    kinds: ["seo_page", "content_page", "landing", "report_section"],
    description: "Páginas pilar, clusters, local SEO, schema, informes",
  },
  ads: {
    kinds: ["ad_creative", "landing", "funnel"],
    description: "Meta/Google/TikTok creatividades + landings de destino",
  },
  email: {
    kinds: ["email_sequence", "email"],
    description: "Welcome, nurture, carrito, reactivación, newsletters",
  },
  landing: {
    kinds: ["landing", "block"],
    description: "Landings de captación, producto, evento, reserva",
  },
  funnel: {
    kinds: ["funnel", "landing", "email_sequence", "automation_recipe"],
    description: "Embudos multi-paso con automatización",
  },
  ecommerce: {
    kinds: ["landing", "email_sequence", "ad_creative", "funnel"],
    description: "Tienda, colección, oferta flash, post-compra",
  },
  saas_b2b: {
    kinds: ["landing", "funnel", "email_sequence", "content_page"],
    description: "Demo, trial, case study, pricing, playbook",
  },
  local: {
    kinds: ["landing", "seo_page", "email_sequence", "automation_recipe"],
    description: "Negocio de proximidad: reservas, citas, mapa",
  },
  agency: {
    kinds: ["landing", "report_section", "email_sequence", "funnel"],
    description: "Propuestas, auditorías, onboarding cliente agencia",
  },
  social: {
    kinds: ["ad_creative", "content_page"],
    description: "Posts, carruseles, stories, calendario",
  },
  content: {
    kinds: ["content_page", "seo_page", "email"],
    description: "Blog, guías, lead magnets, pillar pages",
  },
  cro: {
    kinds: ["landing", "funnel", "report_section"],
    description: "Tests A/B, heatmaps narrativos, optimización CTA",
  },
  analytics: {
    kinds: ["report_section"],
    description: "Secciones de informe CEO, GA4, atribución",
  },
  brand: {
    kinds: ["landing", "content_page", "ad_creative"],
    description: "Brand book lite, manifiesto, identidad visual",
  },
  chatbot: {
    kinds: ["automation_recipe", "landing"],
    description: "Flujos FAQ, cita, ventas, soporte",
  },
  automation: {
    kinds: ["automation_recipe", "email_sequence"],
    description: "Workflows trigger → acción con plantillas",
  },
  report: {
    kinds: ["report_section"],
    description: "Bloques de informe pack y dashboard",
  },
};

export const SECTOR_VERTICAL_MAP: Record<TemplateSector, TemplateVertical> = {
  restaurant: "local",
  cafe: "local",
  dental: "local",
  clinic: "local",
  medical: "local",
  legal: "local",
  accounting: "local",
  real_estate: "local",
  fitness: "local",
  gym: "local",
  beauty: "local",
  spa: "local",
  salon: "local",
  veterinary: "local",
  automotive: "local",
  plumber: "local",
  electrician: "local",
  cleaning: "local",
  landscaping: "local",
  hotel: "local",
  tourism: "local",
  education: "local",
  tutoring: "local",
  ecommerce_fashion: "ecommerce",
  ecommerce_electronics: "ecommerce",
  ecommerce_food: "ecommerce",
  ecommerce_beauty: "ecommerce",
  ecommerce_home: "ecommerce",
  marketplace: "ecommerce",
  saas_b2b: "saas_b2b",
  saas_b2c: "saas_b2b",
  agency: "agency",
  freelancer: "agency",
  coach: "creator",
  infoproduct: "creator",
  course: "creator",
  nonprofit: "local",
  solar: "local",
  construction: "local",
  wedding: "local",
  photography: "creator",
  general: "local",
};

/** Target volumes at 18 months (planning constants). */
export const LIBRARY_TARGET_18M = {
  blocks: 120,
  landings: 400,
  funnels: 80,
  email_sequences: 150,
  emails: 500,
  ad_creatives: 300,
  seo_pages: 200,
  automation_recipes: 100,
  report_sections: 60,
  sectors_covered: 40,
  languages: 6,
} as const;
