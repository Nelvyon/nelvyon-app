import { redirect } from "next/navigation";

/** Legacy F62 hubs → real tenant SaaS modules (permanent migration map). */
export const SAAS_LEGACY_F62_REDIRECTS: Record<string, string> = {
  affiliates: "/saas/affiliates",
  cpq: "/saas/documentos",
  dialer: "/saas/dialer",
  "email-warmup": "/saas/secuencias",
  "fb-messenger": "/saas/inbox",
  "instagram-dm": "/saas/inbox",
  "intent-data": "/saas/lead-scoring",
  integrations: "/saas/integraciones",
  leads: "/saas/prospecting",
  linkedin: "/saas/publicidad",
  "pr-digital": "/saas/reputacion",
  publicidad: "/saas/publicidad",
  "snapchat-ads": "/saas/publicidad",
  social: "/saas/social",
  support: "/saas/helpdesk",
  text2pay: "/saas/billing",
  "tiktok-ads": "/saas/publicidad",
  "tiktok-dm": "/saas/inbox",
  "web-builder": "/saas/web-builder",
};

export function legacyF62RedirectPath(segment: string): string {
  return SAAS_LEGACY_F62_REDIRECTS[segment] ?? "/saas/dashboard";
}

/** Use in legacy `/saas/dashboard/*` pages — server redirect to real module. */
export function redirectLegacyF62Module(segment: string): never {
  redirect(legacyF62RedirectPath(segment));
}
