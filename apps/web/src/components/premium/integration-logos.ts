export type IntegrationLogo = {
  name: string;
  slug?: string;
  brandColor?: string;
};

/** Logos para Logo Cloud Marquee — integraciones reales, sin marcas de clientes. */
export const NELVYON_INTEGRATION_LOGOS: IntegrationLogo[] = [
  { name: "Google", slug: "google", brandColor: "4285F4" },
  { name: "Meta", slug: "meta", brandColor: "0081FB" },
  { name: "Instagram", slug: "instagram", brandColor: "E4405F" },
  { name: "TikTok", slug: "tiktok", brandColor: "FFFFFF" },
  { name: "LinkedIn", slug: "linkedin", brandColor: "0A66C2" },
  { name: "WhatsApp", slug: "whatsapp", brandColor: "25D366" },
  { name: "Stripe", slug: "stripe", brandColor: "635BFF" },
  { name: "Shopify", slug: "shopify", brandColor: "96BF48" },
  { name: "Gmail", slug: "gmail", brandColor: "EA4335" },
  { name: "Google Calendar", slug: "googlecalendar", brandColor: "4285F4" },
];
