/** Visible SaaS product navigation — only modules with real tenant APIs. */
export type SaasNavId =
  | "dashboard"
  | "crm"
  | "pipeline"
  | "campanias"
  | "sms"
  | "whatsapp"
  | "social"
  | "publicidad"
  | "seo"
  | "workflows"
  | "formularios"
  | "citas"
  | "agentes"
  | "billing"
  | "settings";

export type SaasNavItem = {
  id: SaasNavId;
  label: string;
  href: string;
  /** Permission required to see this nav item (optional). */
  permission?: "billing.read" | "settings.read";
};

export const SAAS_NAV_ITEMS: readonly SaasNavItem[] = [
  { id: "dashboard", label: "Dashboard", href: "/saas/dashboard" },
  { id: "crm", label: "CRM", href: "/saas/crm" },
  { id: "pipeline", label: "Pipeline", href: "/saas/crm?tab=pipeline" },
  { id: "campanias", label: "Email Campañas", href: "/saas/campanias" },
  { id: "sms", label: "SMS Marketing", href: "/saas/sms" },
  { id: "whatsapp", label: "WhatsApp", href: "/saas/whatsapp" },
  { id: "social", label: "Redes Sociales", href: "/saas/social" },
  { id: "publicidad", label: "Publicidad", href: "/saas/publicidad" },
  { id: "seo", label: "SEO", href: "/saas/seo" },
  { id: "workflows", label: "Workflows", href: "/saas/workflows" },
  { id: "formularios", label: "Formularios", href: "/saas/formularios" },
  { id: "citas", label: "Agenda / Citas", href: "/saas/citas" },
  { id: "agentes", label: "⚡ Agentes IA", href: "/saas/agentes" },
  { id: "citas", label: "💬 Asistente IA", href: "/saas/chat" },
  { id: "billing", label: "Facturación", href: "/saas/billing", permission: "billing.read" },
  { id: "settings", label: "Configuración", href: "/saas/settings", permission: "settings.read" },
] as const;

/**
 * Routes kept in codebase but hidden from SaaS nav (legacy, mock, or incomplete).
 * See docs/PHASE_3B_SAAS_LEGACY_CLEANUP.md
 */
export const SAAS_HIDDEN_ROUTES = {
  legacyCrm: ["/dashboard/crm", "/crm/deals", "/crm/clients"],
  legacyBilling: ["/dashboard/settings"],
  os: ["/os/execution"],
  viteOnly: ["/saas/pipelines"],
  f62Modules: [
    "/saas/dashboard/affiliates",
    "/saas/dashboard/cpq",
    "/saas/dashboard/dialer",
    "/saas/dashboard/email-warmup",
    "/saas/dashboard/fb-messenger",
    "/saas/dashboard/instagram-dm",
    "/saas/dashboard/intent-data",
    "/saas/dashboard/integrations",
    "/saas/dashboard/leads",
    "/saas/dashboard/linkedin",
    "/saas/dashboard/pr-digital",
    "/saas/dashboard/publicidad",
    "/saas/dashboard/snapchat-ads",
    "/saas/dashboard/social",
    "/saas/dashboard/support",
    "/saas/dashboard/text2pay",
    "/saas/dashboard/tiktok-ads",
    "/saas/dashboard/tiktok-dm",
    "/saas/dashboard/web-builder",
  ],
} as const;

export function isSaasNavActive(activeId: SaasNavId, itemId: SaasNavId): boolean {
  return activeId === itemId;
}

export function filterSaasNavForPermissions(
  permissions: readonly string[],
  items: readonly SaasNavItem[] = SAAS_NAV_ITEMS,
): SaasNavItem[] {
  return items.filter((item) => !item.permission || permissions.includes(item.permission));
}
