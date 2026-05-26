export type StatusCell = "yes" | "warn" | "no";

export type CompetitorLogo = { name: string; domain: string };

export type MarketCompareRow = {
  service: string;
  logos: CompetitorLogo[];
  marketPrice: string;
};

export const HOME_MARKET_COMPARE_ROWS: MarketCompareRow[] = [
  { service: "SEO & Posicionamiento", logos: [{ name: "Semrush", domain: "semrush.com" }, { name: "Moz", domain: "moz.com" }], marketPrice: "€500-2000/mes" },
  { service: "Google Ads / SEM", logos: [{ name: "Google Ads", domain: "ads.google.com" }], marketPrice: "€300-1500/mes" },
  { service: "Meta Ads (FB+IG)", logos: [{ name: "Meta", domain: "meta.com" }], marketPrice: "€400-2000/mes" },
  { service: "TikTok Ads", logos: [{ name: "TikTok", domain: "tiktok.com" }], marketPrice: "€500-3000/mes" },
  { service: "Email Marketing", logos: [{ name: "Mailchimp", domain: "mailchimp.com" }, { name: "Klaviyo", domain: "klaviyo.com" }], marketPrice: "€200-800/mes" },
  { service: "Content Marketing", logos: [], marketPrice: "€300-1500/mes" },
  { service: "Social Media", logos: [{ name: "Hootsuite", domain: "hootsuite.com" }], marketPrice: "€400-1500/mes" },
  { service: "Web & Landings", logos: [{ name: "WordPress", domain: "wordpress.com" }, { name: "Wix", domain: "wix.com" }], marketPrice: "€1000-5000 único" },
  { service: "Video Marketing", logos: [], marketPrice: "€500-3000/pieza" },
  { service: "Automatización IA", logos: [], marketPrice: "€800-4000/mes" },
  { service: "WhatsApp Marketing", logos: [{ name: "WhatsApp", domain: "business.whatsapp.com" }], marketPrice: "€200-600/mes" },
  { service: "CRO & Optimización", logos: [], marketPrice: "€500-2000/mes" },
  { service: "Reputación & PR", logos: [], marketPrice: "€400-1500/mes" },
  { service: "Análisis & Reporting", logos: [{ name: "Analytics", domain: "analytics.google.com" }], marketPrice: "€200-800/mes" },
];

export type SaasPlatformRow = {
  feature: string;
  hubspot: StatusCell | string;
  ghl: StatusCell | string;
  activecampaign: StatusCell | string;
  hootsuite: StatusCell | string;
  nelvyon: StatusCell | string;
};

export const SAAS_PLATFORM_COMPARE_ROWS: SaasPlatformRow[] = [
  { feature: "CRM integrado", hubspot: "yes", ghl: "yes", activecampaign: "yes", hootsuite: "no", nelvyon: "yes" },
  { feature: "Email marketing", hubspot: "yes", ghl: "yes", activecampaign: "yes", hootsuite: "no", nelvyon: "yes" },
  { feature: "SMS marketing", hubspot: "warn", ghl: "yes", activecampaign: "yes", hootsuite: "no", nelvyon: "yes" },
  { feature: "WhatsApp Business", hubspot: "no", ghl: "warn", activecampaign: "no", hootsuite: "no", nelvyon: "yes" },
  { feature: "Social media scheduler", hubspot: "yes", ghl: "yes", activecampaign: "no", hootsuite: "yes", nelvyon: "yes" },
  { feature: "Landing page builder", hubspot: "yes", ghl: "yes", activecampaign: "warn", hootsuite: "no", nelvyon: "yes" },
  { feature: "Funnel builder", hubspot: "warn", ghl: "yes", activecampaign: "warn", hootsuite: "no", nelvyon: "yes" },
  { feature: "Chatbot IA", hubspot: "warn", ghl: "yes", activecampaign: "no", hootsuite: "no", nelvyon: "yes" },
  { feature: "Automatizaciones visuales", hubspot: "yes", ghl: "yes", activecampaign: "yes", hootsuite: "warn", nelvyon: "yes" },
  { feature: "Reportes en tiempo real", hubspot: "yes", ghl: "yes", activecampaign: "yes", hootsuite: "yes", nelvyon: "yes" },
  { feature: "Multi-workspace", hubspot: "yes", ghl: "yes", activecampaign: "warn", hootsuite: "yes", nelvyon: "yes" },
  { feature: "White label", hubspot: "no", ghl: "yes", activecampaign: "no", hootsuite: "no", nelvyon: "yes" },
  { feature: "Soporte en español", hubspot: "no", ghl: "no", activecampaign: "no", hootsuite: "no", nelvyon: "yes" },
  { feature: "Precio inicial (€/mes)", hubspot: "€890+/mes", ghl: "€97/mes", activecampaign: "€29/mes", hootsuite: "€99/mes", nelvyon: "€97/mes" },
  { feature: "IA integrada nativa", hubspot: "warn", ghl: "warn", activecampaign: "warn", hootsuite: "warn", nelvyon: "yes" },
];

export const SAAS_COMPETITOR_COLUMNS = [
  { key: "hubspot" as const, label: "HubSpot", domain: "hubspot.com" },
  { key: "ghl" as const, label: "GoHighLevel", domain: "gohighlevel.com" },
  { key: "activecampaign" as const, label: "ActiveCampaign", domain: "activecampaign.com" },
  { key: "hootsuite" as const, label: "Hootsuite", domain: "hootsuite.com" },
  { key: "nelvyon" as const, label: "NELVYON", domain: "nelvyon.com", highlight: true },
];
