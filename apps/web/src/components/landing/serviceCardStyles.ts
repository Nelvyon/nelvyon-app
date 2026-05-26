import { ALL_SERVICES } from "./agencyContent";

export const SERVICE_GRADIENTS: Record<string, string> = {
  seo: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
  "google-ads": "linear-gradient(135deg, #4285F4 0%, #1967D2 100%)",
  "meta-ads": "linear-gradient(135deg, #1877F2 0%, #0D5FBF 100%)",
  "tiktok-ads": "linear-gradient(135deg, #010101 0%, #2D2D2D 50%, #00CFFF 100%)",
  email: "linear-gradient(135deg, #FF6B35 0%, #D4380D 100%)",
  automatizacion: "linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)",
  webs: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
  chatbot: "linear-gradient(135deg, #0066FF 0%, #0044CC 100%)",
  ecommerce: "linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)",
  branding: "linear-gradient(135deg, #EC4899 0%, #BE185D 100%)",
  social: "linear-gradient(135deg, #14B8A6 0%, #0D9488 100%)",
  "contenido-ia": "linear-gradient(135deg, #F97316 0%, #EA580C 100%)",
  "sms-whatsapp": "linear-gradient(135deg, #22C55E 0%, #16A34A 100%)",
  crm: "linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)",
  "video-ia": "linear-gradient(135deg, #A855F7 0%, #7E22CE 100%)",
  "imagen-ia": "linear-gradient(135deg, #06B6D4 0%, #0891B2 100%)",
  "copy-ia": "linear-gradient(135deg, #E11D48 0%, #9F1239 100%)",
  analytics: "linear-gradient(135deg, #64748B 0%, #334155 100%)",
  reputacion: "linear-gradient(135deg, #FBBF24 0%, #D97706 100%)",
  influencer: "linear-gradient(135deg, #F472B6 0%, #DB2777 100%)",
  pr: "linear-gradient(135deg, #0EA5E9 0%, #0369A1 100%)",
  presupuestos: "linear-gradient(135deg, #84CC16 0%, #4D7C0F 100%)",
  snapchat: "linear-gradient(135deg, #FFFC00 0%, #EAB308 100%)",
  linkedin: "linear-gradient(135deg, #0A66C2 0%, #004182 100%)",
  auditoria: "linear-gradient(135deg, #1E293B 0%, #0F172A 100%)",
};

export const HOME_FEATURED_SLUGS = [
  "seo",
  "google-ads",
  "meta-ads",
  "tiktok-ads",
  "email",
  "automatizacion",
  "webs",
  "chatbot",
] as const;

export const HOME_FEATURED_SERVICES = HOME_FEATURED_SLUGS.map(
  (slug) => ALL_SERVICES.find((s) => s.slug === slug)!,
);
