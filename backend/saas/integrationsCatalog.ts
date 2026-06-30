export type IntegrationCategory =
  | "ads" | "crm" | "email" | "commerce" | "analytics" | "comms" | "productivity" | "payments";

export type IntegrationConnectionType = "oauth" | "env" | "db" | "manual";
export type IntegrationCatalogStatus = "live" | "beta" | "coming_soon";

export interface IntegrationConnector {
  id: string;
  slug: string;
  displayName: string;
  icon: string;
  category: IntegrationCategory;
  connectionType: IntegrationConnectionType;
  envKeys: string[];
  docsUrl?: string;
  relatedRoute?: string;
  status: IntegrationCatalogStatus;
}

export const INTEGRATIONS_CATALOG: IntegrationConnector[] = [
  // ── Ads ──────────────────────────────────────────────────────────────────
  {
    id: "meta", slug: "meta", displayName: "Meta Ads", icon: "📘",
    category: "ads", connectionType: "oauth",
    envKeys: ["META_CLIENT_ID", "META_CLIENT_SECRET"],
    relatedRoute: "/saas/publicidad", status: "live",
  },
  {
    id: "google", slug: "google", displayName: "Google Ads", icon: "🔍",
    category: "ads", connectionType: "oauth",
    envKeys: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
    relatedRoute: "/saas/publicidad", status: "live",
  },
  {
    id: "linkedin", slug: "linkedin", displayName: "LinkedIn Ads", icon: "💼",
    category: "ads", connectionType: "oauth",
    envKeys: ["LINKEDIN_CLIENT_ID", "LINKEDIN_CLIENT_SECRET"],
    relatedRoute: "/saas/publicidad", status: "live",
  },
  {
    id: "tiktok", slug: "tiktok", displayName: "TikTok Ads", icon: "🎵",
    category: "ads", connectionType: "oauth",
    envKeys: ["TIKTOK_CLIENT_ID", "TIKTOK_CLIENT_SECRET"],
    relatedRoute: "/saas/publicidad", status: "live",
  },
  {
    id: "snapchat", slug: "snapchat", displayName: "Snapchat Ads", icon: "👻",
    category: "ads", connectionType: "oauth",
    envKeys: ["SNAPCHAT_CLIENT_ID", "SNAPCHAT_CLIENT_SECRET"],
    relatedRoute: "/saas/publicidad", status: "live",
  },
  {
    id: "google_analytics", slug: "google_analytics", displayName: "Google Analytics 4", icon: "📈",
    category: "analytics", connectionType: "oauth",
    envKeys: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
    relatedRoute: "/saas/reportes", status: "live",
  },

  // ── CRM ──────────────────────────────────────────────────────────────────
  {
    id: "hubspot", slug: "hubspot", displayName: "HubSpot", icon: "🔶",
    category: "crm", connectionType: "oauth",
    envKeys: ["HUBSPOT_CLIENT_ID", "HUBSPOT_CLIENT_SECRET"],
    docsUrl: "https://developers.hubspot.com/docs/api/oauth-quickstart-guide", status: "live",
  },
  {
    id: "salesforce", slug: "salesforce", displayName: "Salesforce", icon: "☁️",
    category: "crm", connectionType: "oauth",
    envKeys: ["SALESFORCE_CLIENT_ID", "SALESFORCE_CLIENT_SECRET"],
    status: "live",
  },
  {
    id: "pipedrive", slug: "pipedrive", displayName: "Pipedrive", icon: "🔵",
    category: "crm", connectionType: "oauth",
    envKeys: ["PIPEDRIVE_CLIENT_ID", "PIPEDRIVE_CLIENT_SECRET"],
    status: "live",
  },
  {
    id: "zoho", slug: "zoho", displayName: "Zoho CRM", icon: "🟢",
    category: "crm", connectionType: "oauth",
    envKeys: ["ZOHO_CLIENT_ID", "ZOHO_CLIENT_SECRET"],
    status: "live",
  },
  {
    id: "intercom", slug: "intercom", displayName: "Intercom", icon: "🔷",
    category: "crm", connectionType: "oauth",
    envKeys: ["INTERCOM_CLIENT_ID", "INTERCOM_CLIENT_SECRET"],
    status: "live",
  },

  // ── Email ─────────────────────────────────────────────────────────────────
  {
    id: "ses", slug: "ses", displayName: "AWS SES", icon: "📧",
    category: "email", connectionType: "env",
    envKeys: ["SES_ACCESS_KEY_ID", "SES_SECRET_ACCESS_KEY", "SES_FROM_EMAIL"],
    docsUrl: "https://docs.aws.amazon.com/ses/", status: "live",
  },
  {
    id: "mailchimp", slug: "mailchimp", displayName: "Mailchimp", icon: "🐒",
    category: "email", connectionType: "env",
    envKeys: ["MAILCHIMP_API_KEY"],
    status: "live",
  },
  {
    id: "klaviyo", slug: "klaviyo", displayName: "Klaviyo", icon: "📮",
    category: "email", connectionType: "env",
    envKeys: ["KLAVIYO_API_KEY"],
    relatedRoute: "/saas/campanias", status: "live",
  },
  {
    id: "google_calendar", slug: "google_calendar", displayName: "Google Calendar", icon: "📅",
    category: "productivity", connectionType: "oauth",
    envKeys: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
    relatedRoute: "/saas/calendario", status: "live",
  },

  // ── Commerce ──────────────────────────────────────────────────────────────
  {
    id: "stripe", slug: "stripe", displayName: "Stripe", icon: "💳",
    category: "payments", connectionType: "env",
    envKeys: ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"],
    relatedRoute: "/saas/billing", status: "live",
  },
  {
    id: "paypal", slug: "paypal", displayName: "PayPal", icon: "🅿️",
    category: "payments", connectionType: "oauth",
    envKeys: ["PAYPAL_CLIENT_ID", "PAYPAL_CLIENT_SECRET"],
    status: "live",
  },
  {
    id: "shopify", slug: "shopify", displayName: "Shopify", icon: "🛒",
    category: "commerce", connectionType: "manual",
    envKeys: ["SHOPIFY_API_KEY", "SHOPIFY_API_SECRET"],
    relatedRoute: "/saas/store", status: "live",
  },
  {
    id: "woocommerce", slug: "woocommerce", displayName: "WooCommerce", icon: "🏪",
    category: "commerce", connectionType: "manual",
    envKeys: ["WOOCOMMERCE_URL", "WOOCOMMERCE_CONSUMER_KEY", "WOOCOMMERCE_CONSUMER_SECRET"],
    relatedRoute: "/saas/store",
    status: "live",
  },
  {
    id: "quickbooks", slug: "quickbooks", displayName: "QuickBooks", icon: "📒",
    category: "payments", connectionType: "oauth",
    envKeys: ["QUICKBOOKS_CLIENT_ID", "QUICKBOOKS_CLIENT_SECRET"],
    status: "live",
  },
  {
    id: "xero", slug: "xero", displayName: "Xero", icon: "💹",
    category: "payments", connectionType: "oauth",
    envKeys: ["XERO_CLIENT_ID", "XERO_CLIENT_SECRET"],
    status: "live",
  },

  // ── Comms ─────────────────────────────────────────────────────────────────
  {
    id: "slack", slug: "slack", displayName: "Slack", icon: "💬",
    category: "comms", connectionType: "oauth",
    envKeys: ["SLACK_CLIENT_ID", "SLACK_CLIENT_SECRET"],
    status: "live",
  },
  {
    id: "twilio", slug: "twilio", displayName: "Twilio SMS", icon: "📱",
    category: "comms", connectionType: "env",
    envKeys: ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_FROM_NUMBER"],
    status: "live",
  },
  {
    id: "whatsapp", slug: "whatsapp", displayName: "WhatsApp Business", icon: "💚",
    category: "comms", connectionType: "env",
    envKeys: ["META_WA_PHONE_NUMBER_ID", "META_WA_ACCESS_TOKEN"],
    relatedRoute: "/saas/whatsapp", status: "live",
  },
  {
    id: "zapier", slug: "zapier", displayName: "Zapier", icon: "⚡",
    category: "productivity", connectionType: "manual",
    envKeys: [],
    relatedRoute: "/saas/webhooks",
    status: "live",
  },
  {
    id: "make", slug: "make", displayName: "Make (Integromat)", icon: "🔄",
    category: "productivity", connectionType: "manual",
    envKeys: [],
    relatedRoute: "/saas/webhooks",
    status: "live",
  },
  {
    id: "n8n", slug: "n8n", displayName: "n8n", icon: "🔧",
    category: "productivity", connectionType: "manual",
    envKeys: [],
    relatedRoute: "/saas/webhooks",
    status: "live",
  },
  {
    id: "google_tag_manager", slug: "google_tag_manager", displayName: "Google Tag Manager", icon: "🏷️",
    category: "analytics", connectionType: "manual",
    envKeys: ["GTM_CONTAINER_ID"],
    relatedRoute: "/saas/webhooks",
    status: "live",
  },

  // ── Analytics & Tools ─────────────────────────────────────────────────────
  {
    id: "openai", slug: "openai", displayName: "OpenAI", icon: "🤖",
    category: "analytics", connectionType: "env",
    envKeys: ["OPENAI_API_KEY"],
    status: "live",
  },
  {
    id: "semrush", slug: "semrush", displayName: "SEMrush", icon: "🔎",
    category: "analytics", connectionType: "env",
    envKeys: ["SEMRUSH_API_KEY"],
    status: "live",
  },
  {
    id: "hotjar", slug: "hotjar", displayName: "Hotjar", icon: "🔥",
    category: "analytics", connectionType: "env",
    envKeys: ["HOTJAR_SITE_ID"],
    status: "live",
  },
  {
    id: "mixpanel", slug: "mixpanel", displayName: "Mixpanel", icon: "📊",
    category: "analytics", connectionType: "env",
    envKeys: ["MIXPANEL_TOKEN"],
    status: "live",
  },

  // ── Productivity ──────────────────────────────────────────────────────────
  {
    id: "notion", slug: "notion", displayName: "Notion", icon: "📝",
    category: "productivity", connectionType: "oauth",
    envKeys: ["NOTION_CLIENT_ID", "NOTION_CLIENT_SECRET"],
    status: "live",
  },
  {
    id: "calendly", slug: "calendly", displayName: "Calendly", icon: "📆",
    category: "productivity", connectionType: "oauth",
    envKeys: ["CALENDLY_CLIENT_ID", "CALENDLY_CLIENT_SECRET"],
    relatedRoute: "/saas/calendario", status: "live",
  },
];

export function getCatalogBySlug(slug: string): IntegrationConnector | undefined {
  return INTEGRATIONS_CATALOG.find(c => c.slug === slug);
}
