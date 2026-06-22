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
  | "funnels"
  | "formularios"
  | "citas"
  | "web-builder"
  | "agentes"
  | "chat"
  | "lms"
  | "copywriter"
  | "helpdesk"
  | "afiliados"
  | "reportes"
  | "integraciones"
  | "dialer"
  | "loyalty"
  | "billing"
  | "settings";

export type SaasNavItem = {
  id: SaasNavId;
  label: string;
  href: string;
  group?: string;
  /** Permission required to see this nav item (optional). */
  permission?: "billing.read" | "settings.read";
};

export const SAAS_NAV_ITEMS: readonly SaasNavItem[] = [
  // Core
  { id: "dashboard", label: "Dashboard", href: "/saas/dashboard", group: "principal" },
  { id: "crm", label: "CRM", href: "/saas/crm", group: "principal" },
  { id: "pipeline", label: "Pipeline", href: "/saas/crm?tab=pipeline", group: "principal" },
  // Comunicación
  { id: "campanias", label: "Email Campañas", href: "/saas/campanias", group: "comunicacion" },
  { id: "sms", label: "SMS Marketing", href: "/saas/sms", group: "comunicacion" },
  { id: "whatsapp", label: "WhatsApp", href: "/saas/whatsapp", group: "comunicacion" },
  { id: "social", label: "Redes Sociales", href: "/saas/social", group: "comunicacion" },
  // Captación
  { id: "publicidad", label: "Publicidad", href: "/saas/publicidad", group: "captacion" },
  { id: "seo", label: "SEO", href: "/saas/seo", group: "captacion" },
  { id: "funnels", label: "Funnel Builder", href: "/saas/funnels", group: "captacion" },
  { id: "web-builder", label: "Web Builder", href: "/saas/web-builder", group: "captacion" },
  // Gestión
  { id: "workflows", label: "Workflows", href: "/saas/workflows", group: "gestion" },
  { id: "formularios", label: "Formularios", href: "/saas/formularios", group: "gestion" },
  { id: "citas", label: "Agenda / Citas", href: "/saas/citas", group: "gestion" },
  { id: "helpdesk", label: "Helpdesk", href: "/saas/helpdesk", group: "gestion" },
  { id: "dialer", label: "Dialer (Llamadas)", href: "/saas/dialer", group: "gestion" },
  { id: "loyalty", label: "Fidelización", href: "/saas/loyalty", group: "gestion" },
  // IA & Formación
  { id: "agentes", label: "⚡ Agentes IA", href: "/saas/agentes", group: "ia" },
  { id: "chat", label: "💬 Asistente IA", href: "/saas/chat", group: "ia" },
  { id: "lms", label: "Cursos / LMS", href: "/saas/lms", group: "ia" },
  { id: "copywriter", label: "✍️ Copywriter IA", href: "/saas/copywriter", group: "ia" },
  // Cuenta
  { id: "reportes", label: "Reportes", href: "/saas/reportes", group: "cuenta" },
  { id: "integraciones", label: "Integraciones", href: "/saas/integraciones", group: "cuenta" },
  { id: "afiliados", label: "Afiliados", href: "/saas/afiliados", group: "cuenta" },
  { id: "billing", label: "Facturación", href: "/saas/billing", group: "cuenta", permission: "billing.read" },
  { id: "settings", label: "Configuración", href: "/saas/settings", group: "cuenta", permission: "settings.read" },
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
