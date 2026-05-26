export type StatusCell = "yes" | "warn" | "no";

export type AgencyCompareRow = {
  service: string;
  large: StatusCell;
  medium: StatusCell;
  small: StatusCell;
  nelvyon: StatusCell;
};

export const HOME_AGENCY_COMPARE_ROWS: AgencyCompareRow[] = [
  { service: "SEO", large: "yes", medium: "yes", small: "warn", nelvyon: "yes" },
  { service: "SEM / Google Ads", large: "yes", medium: "yes", small: "warn", nelvyon: "yes" },
  { service: "Meta Ads", large: "yes", medium: "yes", small: "warn", nelvyon: "yes" },
  { service: "Email Marketing", large: "yes", medium: "yes", small: "yes", nelvyon: "yes" },
  { service: "Content Marketing", large: "yes", medium: "yes", small: "warn", nelvyon: "yes" },
  { service: "Social Media", large: "yes", medium: "yes", small: "yes", nelvyon: "yes" },
  { service: "Web & Landing", large: "yes", medium: "warn", small: "warn", nelvyon: "yes" },
  { service: "Video Marketing", large: "yes", medium: "warn", small: "no", nelvyon: "yes" },
  { service: "CRO", large: "yes", medium: "warn", small: "no", nelvyon: "yes" },
  { service: "Automatización IA", large: "warn", medium: "warn", small: "no", nelvyon: "yes" },
  { service: "Reputación / PR", large: "yes", medium: "warn", small: "no", nelvyon: "yes" },
  { service: "WhatsApp Marketing", large: "warn", medium: "warn", small: "no", nelvyon: "yes" },
  { service: "TikTok Ads", large: "yes", medium: "warn", small: "no", nelvyon: "yes" },
  { service: "Análisis & Reporting", large: "yes", medium: "yes", small: "warn", nelvyon: "yes" },
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
