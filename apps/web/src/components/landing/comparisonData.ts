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
  fragmented: StatusCell | string;
  nelvyon: StatusCell | string;
};

/** Nelvyon vs stack fragmentado — sin citar marcas de terceros. */
export const SAAS_PLATFORM_COMPARE_ROWS: SaasPlatformRow[] = [
  { feature: "CRM integrado", fragmented: "warn", nelvyon: "yes" },
  { feature: "Email marketing", fragmented: "warn", nelvyon: "yes" },
  { feature: "SMS marketing", fragmented: "warn", nelvyon: "yes" },
  { feature: "WhatsApp Business", fragmented: "no", nelvyon: "yes" },
  { feature: "Social media scheduler", fragmented: "warn", nelvyon: "yes" },
  { feature: "Landing page builder", fragmented: "warn", nelvyon: "yes" },
  { feature: "Funnel builder", fragmented: "no", nelvyon: "yes" },
  { feature: "Chatbot IA", fragmented: "no", nelvyon: "yes" },
  { feature: "Automatizaciones visuales", fragmented: "warn", nelvyon: "yes" },
  { feature: "Plantillas oficiales importables", fragmented: "no", nelvyon: "yes" },
  { feature: "Reportes en tiempo real", fragmented: "warn", nelvyon: "yes" },
  { feature: "Multi-workspace", fragmented: "no", nelvyon: "yes" },
  { feature: "White label", fragmented: "no", nelvyon: "yes" },
  { feature: "Soporte en español", fragmented: "warn", nelvyon: "yes" },
  { feature: "IA integrada nativa", fragmented: "warn", nelvyon: "yes" },
];

export const SAAS_COMPETITOR_COLUMNS = [
  { key: "fragmented" as const, label: "Stack fragmentado", domain: "nelvyon.com" },
  { key: "nelvyon" as const, label: "NELVYON", domain: "nelvyon.com", highlight: true },
];
