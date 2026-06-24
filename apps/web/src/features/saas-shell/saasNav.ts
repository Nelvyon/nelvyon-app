/** Visible SaaS product navigation — only modules with real tenant APIs + wired UI. */
export type SaasNavId =
  | "dashboard"
  | "crm"
  | "pipeline"
  | "campanias"
  | "sms"
  | "social"
  | "publicidad"
  | "seo"
  | "workflows"
  | "formularios"
  | "citas"
  | "agentes"
  | "chat"
  | "copywriter"
  | "reputacion"
  | "helpdesk"
  | "reportes"
  | "integraciones"
  | "billing"
  | "settings"
  | "herramientas"
  | "auditoria"
  | "lead-scoring"
  | "snippets"
  | "countdown"
  | "objetos"
  | "prospecting"
  | "comunidades"
  | "documentos"
  | "facturas"
  | "encuestas"
  | "qr"
  | "subcuentas"
  | "ab-testing"
  | "inbox"
  | "calendar"
  | "team"
  | "white-label"
  | "webhooks"
  | "api-keys"
  | "whatsapp"
  | "funnels"
  | "web-builder"
  | "lms"
  | "dialer"
  | "secuencias";

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
  { id: "inbox", label: "📥 Bandeja Unificada", href: "/saas/inbox", group: "principal" },
  { id: "crm", label: "CRM", href: "/saas/crm", group: "principal" },
  { id: "pipeline", label: "Pipeline", href: "/saas/pipeline", group: "principal" },
  { id: "calendar", label: "📅 Calendario", href: "/saas/calendar", group: "principal" },
  // Comunicación
  { id: "campanias", label: "Email Campañas", href: "/saas/campanias", group: "comunicacion" },
  { id: "sms", label: "SMS Marketing", href: "/saas/sms", group: "comunicacion" },
  { id: "social", label: "Redes Sociales", href: "/saas/social", group: "comunicacion" },
  { id: "whatsapp", label: "💬 WhatsApp", href: "/saas/whatsapp", group: "comunicacion" },
  { id: "dialer", label: "📞 Dialer", href: "/saas/dialer", group: "comunicacion" },
  { id: "secuencias", label: "🔄 Secuencias", href: "/saas/secuencias", group: "comunicacion" },
  // Captación
  { id: "publicidad", label: "Publicidad Digital", href: "/saas/publicidad", group: "captacion" },
  { id: "seo", label: "SEO", href: "/saas/seo", group: "captacion" },
  { id: "reputacion", label: "Reputación", href: "/saas/reputacion", group: "captacion" },
  // Gestión
  { id: "workflows", label: "Workflows", href: "/saas/workflows", group: "gestion" },
  { id: "formularios", label: "Formularios", href: "/saas/formularios", group: "gestion" },
  { id: "citas", label: "Agenda / Citas", href: "/saas/citas", group: "gestion" },
  { id: "helpdesk", label: "Helpdesk", href: "/saas/helpdesk", group: "gestion" },
  { id: "prospecting", label: "Prospección", href: "/saas/prospecting", group: "gestion" },
  { id: "snippets", label: "Snippets", href: "/saas/snippets", group: "gestion" },
  { id: "countdown", label: "Temporizadores", href: "/saas/countdown", group: "gestion" },
  { id: "objetos", label: "Objetos Personalizados", href: "/saas/objetos", group: "gestion" },
  { id: "encuestas", label: "Encuestas & NPS", href: "/saas/encuestas", group: "gestion" },
  { id: "documentos", label: "Documentos & Contratos", href: "/saas/documentos", group: "gestion" },
  { id: "facturas", label: "Facturas a Clientes", href: "/saas/facturas", group: "gestion" },
  { id: "qr", label: "Códigos QR", href: "/saas/qr", group: "gestion" },
  { id: "ab-testing", label: "A/B Testing", href: "/saas/ab-testing", group: "gestion" },
  // IA & Automatización
  { id: "funnels", label: "🚀 Funnels", href: "/saas/funnels", group: "captacion" },
  { id: "web-builder", label: "🌐 Web Builder", href: "/saas/web-builder", group: "captacion" },
  { id: "lms", label: "🎓 LMS — Cursos", href: "/saas/lms", group: "gestion" },
  { id: "agentes", label: "⚡ Agentes IA", href: "/saas/agentes", group: "ia" },
  { id: "chat", label: "💬 Asistente IA", href: "/saas/chat", group: "ia" },
  { id: "copywriter", label: "✍️ Copywriter IA", href: "/saas/copywriter", group: "ia" },
  // Cuenta
  { id: "reportes", label: "Reportes", href: "/saas/reportes", group: "cuenta" },
  { id: "integraciones", label: "Integraciones", href: "/saas/integraciones", group: "cuenta" },
  { id: "herramientas", label: "🛠️ Herramientas", href: "/saas/herramientas", group: "cuenta" },
  { id: "auditoria", label: "Auditoría", href: "/saas/auditoria", group: "cuenta" },
  { id: "lead-scoring", label: "Lead Scoring", href: "/saas/lead-scoring", group: "cuenta" },
  { id: "comunidades", label: "Comunidades", href: "/saas/comunidades", group: "cuenta" },
  { id: "subcuentas", label: "Subcuentas / Agencia", href: "/saas/subcuentas", group: "cuenta" },
  { id: "team", label: "👥 Equipo", href: "/saas/team", group: "cuenta" },
  { id: "white-label", label: "🎨 White Label", href: "/saas/white-label", group: "cuenta" },
  { id: "webhooks", label: "🔗 Webhooks", href: "/saas/webhooks", group: "cuenta" },
  { id: "api-keys", label: "🔑 API Keys", href: "/saas/api-keys", group: "cuenta" },
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
