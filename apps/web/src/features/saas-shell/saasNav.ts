/** Visible SaaS product navigation — only modules with real tenant APIs. */
export type SaasNavId = "dashboard" | "crm" | "pipeline" | "campanias" | "workflows" | "settings";

export type SaasNavItem = {
  id: SaasNavId;
  label: string;
  href: string;
};

export const SAAS_NAV_ITEMS: readonly SaasNavItem[] = [
  { id: "dashboard", label: "Dashboard", href: "/saas/dashboard" },
  { id: "crm", label: "CRM", href: "/saas/crm" },
  { id: "pipeline", label: "Pipeline", href: "/saas/crm?tab=pipeline" },
  { id: "campanias", label: "Campanas", href: "/saas/campanias" },
  { id: "workflows", label: "Workflows", href: "/saas/workflows" },
  { id: "settings", label: "Configuracion", href: "/dashboard/settings" },
] as const;

/**
 * Routes kept in codebase but hidden from SaaS nav (legacy, mock, or incomplete).
 * See docs/PHASE_3B_SAAS_LEGACY_CLEANUP.md
 */
export const SAAS_HIDDEN_ROUTES = {
  legacyCrm: ["/dashboard/crm", "/crm/deals", "/crm/clients"],
  os: ["/os/execution"],
  viteOnly: ["/saas/pipelines", "/saas/billing", "/saas/settings"],
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
