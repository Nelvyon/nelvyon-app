/** Visible SaaS product navigation — only modules with real tenant APIs + wired UI. */
export type SaasNavId =
  | "dashboard"
  | "setup"
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
  | "knowledge-base"
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
  | "secuencias"
  | "store"
  | "affiliates"
  | "loyalty"
  | "memberships"
  | "entregables"
  | "autopilot"
  | "brief-to-launch"
  | "compliance"
  | "benchmark"
  | "pack-store"
  | "data-playbooks"
  | "partner"
  | "voice"
  | "pwa"
  | "security"
  | "deliverability"
  | "marketplace"
  | "attribution"
  | "ai"
  | "erp-purchases"
  | "erp-inventory"
  | "erp-manufacturing"
  | "erp-projects"
  | "erp-sectors";

import type { SaasAction } from "./saasPermissions";

export type SaasNavItem = {
  id: SaasNavId;
  label: string;
  href: string;
  group?: string;
  /** Permission required to see this nav item (optional). */
  permission?: SaasAction;
};

export const SAAS_NAV_ITEMS: readonly SaasNavItem[] = [
  // Core
  { id: "dashboard", label: "Dashboard", href: "/saas/dashboard", group: "principal" },
  { id: "setup", label: "⚙️ Configuración", href: "/saas/setup", group: "principal" },
  { id: "inbox", label: "📥 Bandeja Unificada", href: "/saas/inbox", group: "principal" },
  { id: "crm", label: "CRM", href: "/saas/crm", group: "principal", permission: "contacts.read" },
  { id: "pipeline", label: "Pipeline", href: "/saas/pipeline", group: "principal", permission: "deals.read" },
  { id: "calendar", label: "📅 Calendario", href: "/saas/calendar", group: "principal" },
  // Comunicación
  { id: "campanias", label: "Email Campañas", href: "/saas/campanias", group: "comunicacion", permission: "campanias.read" },
  { id: "deliverability", label: "📬 Deliverability", href: "/saas/deliverability", group: "comunicacion", permission: "campanias.read" },
  { id: "sms", label: "SMS Marketing", href: "/saas/sms", group: "comunicacion", permission: "campanias.read" },
  { id: "social", label: "Redes Sociales", href: "/saas/social", group: "comunicacion" },
  { id: "whatsapp", label: "💬 WhatsApp", href: "/saas/whatsapp", group: "comunicacion", permission: "contacts.read" },
  { id: "dialer", label: "📞 Dialer", href: "/saas/dialer", group: "comunicacion", permission: "contacts.read" },
  { id: "secuencias", label: "🔄 Secuencias", href: "/saas/secuencias", group: "comunicacion", permission: "campanias.read" },
  // Captación
  { id: "publicidad", label: "Publicidad Digital", href: "/saas/publicidad", group: "captacion", permission: "analytics.read" },
  { id: "seo", label: "SEO", href: "/saas/seo", group: "captacion", permission: "analytics.read" },
  { id: "reputacion", label: "Reputación", href: "/saas/reputacion", group: "captacion" },
  // Gestión
  { id: "workflows", label: "Workflows", href: "/saas/workflows", group: "gestion", permission: "workflows.read" },
  { id: "formularios", label: "Formularios", href: "/saas/formularios", group: "gestion", permission: "contacts.read" },
  { id: "citas", label: "Agenda / Citas", href: "/saas/citas", group: "gestion", permission: "contacts.read" },
  { id: "helpdesk", label: "Helpdesk", href: "/saas/helpdesk", group: "gestion" },
  { id: "knowledge-base", label: "📚 Base de Conocimiento", href: "/saas/knowledge-base", group: "gestion" },
  { id: "prospecting", label: "Prospección", href: "/saas/prospecting", group: "gestion", permission: "contacts.read" },
  { id: "snippets", label: "Snippets", href: "/saas/snippets", group: "gestion" },
  { id: "countdown", label: "Temporizadores", href: "/saas/countdown", group: "gestion" },
  { id: "objetos", label: "Objetos Personalizados", href: "/saas/objetos", group: "gestion", permission: "settings.read" },
  { id: "encuestas", label: "Encuestas & NPS", href: "/saas/encuestas", group: "gestion", permission: "contacts.read" },
  { id: "documentos", label: "Documentos & Contratos", href: "/saas/documentos", group: "gestion", permission: "deals.read" },
  { id: "facturas", label: "Facturas a Clientes", href: "/saas/facturas", group: "gestion", permission: "invoices.read" },
  { id: "qr", label: "Códigos QR", href: "/saas/qr", group: "gestion" },
  { id: "ab-testing", label: "A/B Testing", href: "/saas/ab-testing", group: "gestion", permission: "analytics.read" },
  // IA & Automatización
  { id: "funnels", label: "🚀 Funnels", href: "/saas/funnels", group: "captacion", permission: "analytics.read" },
  { id: "web-builder", label: "🌐 Web Builder", href: "/saas/web-builder", group: "captacion", permission: "settings.read" },
  { id: "lms", label: "🎓 LMS — Cursos", href: "/saas/lms", group: "gestion", permission: "settings.read" },
  { id: "store",      label: "🛍️ Tienda Online",         href: "/saas/store",      group: "gestion", permission: "settings.read" },
  { id: "affiliates", label: "🤝 Programa Afiliados",     href: "/saas/affiliates", group: "gestion", permission: "affiliates.read" },
  { id: "loyalty",    label: "🏆 Fidelización",           href: "/saas/loyalty",    group: "gestion", permission: "loyalty.read" },
  { id: "memberships", label: "🎫 Membresías", href: "/saas/memberships", group: "gestion", permission: "loyalty.read" },
  { id: "erp-purchases", label: "Compras ERP", href: "/saas/erp/purchases", group: "gestion", permission: "settings.read" },
  { id: "erp-inventory", label: "Inventario ERP", href: "/saas/erp/inventory", group: "gestion", permission: "settings.read" },
  { id: "erp-manufacturing", label: "Manufactura ERP", href: "/saas/erp/manufacturing", group: "gestion", permission: "settings.read" },
  { id: "erp-projects", label: "Proyectos ERP", href: "/saas/erp/projects", group: "gestion", permission: "settings.read" },
  { id: "erp-sectors", label: "Sectores", href: "/saas/erp/sectors", group: "gestion", permission: "settings.read" },
  { id: "pack-store", label: "🛒 Pack Store", href: "/saas/packs", group: "ia" },
  { id: "data-playbooks", label: "📋 Playbooks", href: "/saas/playbooks", group: "ia", permission: "analytics.read" },
  { id: "brief-to-launch", label: "🚀 Lanzar Pack", href: "/saas/brief-to-launch", group: "ia" },
  { id: "compliance", label: "🔒 Compliance", href: "/saas/compliance", group: "ia", permission: "audit.read" },
  { id: "benchmark", label: "📊 Benchmark", href: "/saas/benchmark", group: "ia", permission: "analytics.read" },
  { id: "ai", label: "🧠 Panel IA", href: "/saas/ai", group: "ia" },
  { id: "autopilot", label: "🤖 Autopilot", href: "/saas/autopilot", group: "ia" },
  { id: "agentes", label: "⚡ Agentes IA", href: "/saas/agentes", group: "ia" },
  { id: "chat", label: "💬 Asistente IA", href: "/saas/chat", group: "ia" },
  { id: "copywriter", label: "✍️ Copywriter IA", href: "/saas/copywriter", group: "ia" },
  // Cuenta
  { id: "entregables", label: "📦 Entregables", href: "/saas/entregables", group: "cuenta" },
  { id: "reportes", label: "Reportes", href: "/saas/reportes", group: "cuenta", permission: "reports.generate" },
  { id: "attribution", label: "📈 Atribución", href: "/saas/reportes?tab=attribution", group: "cuenta", permission: "analytics.read" },
  { id: "integraciones", label: "Integraciones", href: "/saas/integraciones", group: "cuenta", permission: "settings.read" },
  { id: "marketplace", label: "🧩 Marketplace", href: "/saas/marketplace", group: "cuenta" },
  { id: "herramientas", label: "🛠️ Herramientas", href: "/saas/herramientas", group: "cuenta" },
  { id: "voice", label: "🎙️ Voz", href: "/saas/voice", group: "cuenta" },
  { id: "pwa", label: "📲 Instalar App", href: "/saas/pwa", group: "cuenta" },
  { id: "auditoria", label: "Auditoría", href: "/saas/auditoria", group: "cuenta", permission: "audit.read" },
  { id: "lead-scoring", label: "Lead Scoring", href: "/saas/lead-scoring", group: "cuenta", permission: "contacts.read" },
  { id: "comunidades", label: "Comunidades", href: "/saas/comunidades", group: "cuenta" },
  { id: "partner", label: "🤝 Partner Zone", href: "/saas/partner", group: "cuenta", permission: "billing.read" },
  { id: "subcuentas", label: "Subcuentas / Agencia", href: "/saas/subcuentas", group: "cuenta", permission: "settings.write" },
  { id: "team", label: "👥 Equipo", href: "/saas/team", group: "cuenta", permission: "settings.read" },
  { id: "white-label", label: "🎨 White Label", href: "/saas/white-label", group: "cuenta", permission: "settings.write" },
  { id: "webhooks", label: "🔗 Webhooks", href: "/saas/webhooks", group: "cuenta", permission: "settings.read" },
  { id: "api-keys", label: "🔑 API Keys", href: "/saas/api-keys", group: "cuenta", permission: "settings.read" },
  { id: "billing", label: "Facturación", href: "/saas/billing", group: "cuenta", permission: "billing.read" },
  { id: "settings", label: "Configuración", href: "/saas/settings", group: "cuenta", permission: "settings.read" },
  { id: "security", label: "🔐 Seguridad Enterprise", href: "/saas/security", group: "cuenta", permission: "settings.read" },
] as const;

/**
 * Legacy F62 hub URLs — now 301 → real `/saas/*` modules (see legacyF62Redirects.ts).
 * Kept for grep/docs; no longer served as mock UI.
 */
export const SAAS_HIDDEN_ROUTES = {
  legacyCrm: ["/dashboard/crm", "/crm/deals", "/crm/clients"],
  legacyBilling: ["/dashboard/settings"],
  os: ["/os/execution"],
  viteOnly: ["/saas/pipelines"],
  f62Modules: Object.keys({
    affiliates: 1,
    cpq: 1,
    dialer: 1,
    "email-warmup": 1,
    "fb-messenger": 1,
    "instagram-dm": 1,
    "intent-data": 1,
    integrations: 1,
    leads: 1,
    linkedin: 1,
    "pr-digital": 1,
    publicidad: 1,
    "snapchat-ads": 1,
    social: 1,
    support: 1,
    text2pay: 1,
    "tiktok-ads": 1,
    "tiktok-dm": 1,
    "web-builder": 1,
  }).map((slug) => `/saas/dashboard/${slug}`),
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
