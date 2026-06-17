import type { ConnectorDefinition } from "./types";

/** Internal connector registry — maps to backend/integrations + API routes. */
export const OS_CONNECTOR_REGISTRY: ConnectorDefinition[] = [
  {
    id: "google-analytics-4",
    name: "Google Analytics 4",
    category: "analytics",
    status: "live",
    envKeys: ["GA4_PROPERTY_ID", "GOOGLE_OAUTH_CLIENT_ID", "GOOGLE_OAUTH_CLIENT_SECRET"],
    scopes: ["https://www.googleapis.com/auth/analytics.readonly"],
    servicePath: "backend/integrations/GoogleAnalytics4Service.ts",
    apiRoutePrefix: "/api/integrations/google-analytics",
    notes: "OAuth connect + summary metrics.",
  },
  {
    id: "google-search-console",
    name: "Google Search Console",
    category: "seo",
    status: "live",
    envKeys: ["GOOGLE_OAUTH_CLIENT_ID", "GOOGLE_OAUTH_CLIENT_SECRET"],
    scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
    servicePath: "backend/integrations/GoogleSearchConsoleService.ts",
    apiRoutePrefix: "/api/integrations/google-search-console",
  },
  {
    id: "google-ads",
    name: "Google Ads",
    category: "ads",
    status: "oauth_ready",
    envKeys: ["GOOGLE_ADS_DEVELOPER_TOKEN", "GOOGLE_ADS_CUSTOMER_ID"],
    servicePath: "backend/integrations/GoogleAdsService.ts",
    apiRoutePrefix: "/api/integrations/google-ads",
    notes: "Connect flow live; campaign mutate stubbed pending MCC.",
  },
  {
    id: "meta-ads",
    name: "Meta Ads (Facebook/Instagram)",
    category: "ads",
    status: "oauth_ready",
    envKeys: ["META_APP_ID", "META_APP_SECRET"],
    servicePath: "backend/integrations/MetaAdsService.ts",
    apiRoutePrefix: "/api/integrations/meta-ads",
  },
  {
    id: "tiktok-ads",
    name: "TikTok Ads",
    category: "ads",
    status: "stub",
    envKeys: ["TIKTOK_APP_ID", "TIKTOK_APP_SECRET"],
    servicePath: "backend/integrations/TikTokAdsService.ts",
    apiRoutePrefix: "/api/integrations/tiktok-ads",
    notes: "Service class + connect route; metrics stub.",
  },
  {
    id: "linkedin-ads",
    name: "LinkedIn Ads",
    category: "ads",
    status: "stub",
    envKeys: ["LINKEDIN_CLIENT_ID", "LINKEDIN_CLIENT_SECRET"],
    servicePath: "backend/integrations/LinkedInAdsService.ts",
    apiRoutePrefix: "/api/integrations/linkedin-ads",
  },
  {
    id: "semrush",
    name: "SEMrush",
    category: "seo",
    status: "stub",
    envKeys: ["SEMRUSH_API_KEY"],
    servicePath: "backend/integrations/SemrushService.ts",
    apiRoutePrefix: "/api/integrations/semrush",
    notes: "Keyword/competitor data when API key present.",
  },
  {
    id: "shopify",
    name: "Shopify",
    category: "commerce",
    status: "oauth_ready",
    envKeys: ["SHOPIFY_API_KEY", "SHOPIFY_API_SECRET"],
    servicePath: "backend/integrations/ShopifyService.ts",
    apiRoutePrefix: "/api/integrations/shopify",
  },
  {
    id: "hubspot-crm",
    name: "HubSpot CRM",
    category: "crm",
    status: "planned",
    envKeys: ["HUBSPOT_ACCESS_TOKEN"],
    notes: "Stub — use platform CRM until HubSpot connector ships.",
  },
  {
    id: "salesforce-crm",
    name: "Salesforce",
    category: "crm",
    status: "planned",
    envKeys: ["SALESFORCE_CLIENT_ID", "SALESFORCE_CLIENT_SECRET"],
    notes: "Planned Q2 — B2B pack outbound sync.",
  },
  {
    id: "klaviyo",
    name: "Klaviyo",
    category: "email",
    status: "planned",
    envKeys: ["KLAVIYO_PRIVATE_KEY"],
    notes: "Sector agent exists; live API connector planned.",
  },
  {
    id: "mailchimp",
    name: "Mailchimp",
    category: "email",
    status: "planned",
    envKeys: ["MAILCHIMP_API_KEY", "MAILCHIMP_SERVER_PREFIX"],
  },
  {
    id: "amazon-ses",
    name: "Amazon SES",
    category: "email",
    status: "live",
    envKeys: ["SES_REGION", "SES_ACCESS_KEY_ID", "SES_SECRET_ACCESS_KEY", "SES_FROM_EMAIL"],
    servicePath: "apps/web/src/lib/email/sesMailer.ts",
    notes: "Transactional email — register, packs welcome/nurture.",
  },
  {
    id: "whatsapp",
    name: "WhatsApp Business",
    category: "comms",
    status: "stub",
    envKeys: ["WHATSAPP_TOKEN", "WHATSAPP_PHONE_NUMBER_ID"],
    servicePath: "backend/integrations/WhatsAppService.ts",
    apiRoutePrefix: "/api/integrations/whatsapp",
  },
  {
    id: "twilio",
    name: "Twilio SMS/Voice",
    category: "comms",
    status: "stub",
    envKeys: ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN"],
    servicePath: "backend/integrations/TwilioService.ts",
    apiRoutePrefix: "/api/integrations/twilio",
  },
  {
    id: "telegram",
    name: "Telegram Bot",
    category: "comms",
    status: "stub",
    envKeys: ["TELEGRAM_BOT_TOKEN"],
    servicePath: "backend/integrations/TelegramService.ts",
    apiRoutePrefix: "/api/integrations/telegram",
  },
];

export function getConnectorById(id: string): ConnectorDefinition | undefined {
  return OS_CONNECTOR_REGISTRY.find((c) => c.id === id);
}

export function getConnectorsByStatus(status: ConnectorDefinition["status"]): ConnectorDefinition[] {
  return OS_CONNECTOR_REGISTRY.filter((c) => c.status === status);
}

export function getConnectorStats() {
  const counts = { live: 0, oauth_ready: 0, stub: 0, planned: 0 } as Record<
    ConnectorDefinition["status"],
    number
  >;
  for (const c of OS_CONNECTOR_REGISTRY) counts[c.status]++;
  return { total: OS_CONNECTOR_REGISTRY.length, ...counts };
}
