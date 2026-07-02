/** Legacy /dashboard/* GHL routes → canonical /saas/* (or OS packs). */
const DASHBOARD_PREFIX_REDIRECTS: ReadonlyArray<readonly [string, string]> = [
  ["/dashboard/crm", "/saas/crm"],
  ["/dashboard/campanas", "/saas/campanias"],
  ["/dashboard/chatbot", "/saas/agentes"],
  ["/dashboard/workflows", "/saas/workflows"],
  ["/dashboard/automatizacion", "/saas/workflows"],
  ["/dashboard/facturacion", "/saas/facturas"],
  ["/dashboard/contratos", "/saas/documentos"],
  ["/dashboard/formularios", "/saas/formularios"],
  ["/dashboard/calendario", "/saas/calendar"],
  ["/dashboard/helpdesk", "/saas/helpdesk"],
  ["/dashboard/inbox", "/saas/inbox"],
  ["/dashboard/seo", "/saas/seo"],
  ["/dashboard/dialer", "/saas/dialer"],
  ["/dashboard/sms", "/saas/sms"],
  ["/dashboard/qr", "/saas/qr"],
  ["/dashboard/ab-testing", "/saas/ab-testing"],
  ["/dashboard/landing-pages", "/saas/web-builder"],
  ["/dashboard/websites", "/saas/web-builder"],
  ["/dashboard/reportes", "/saas/reportes"],
  ["/dashboard/settings", "/saas/settings"],
  ["/dashboard/white-label", "/saas/white-label"],
  ["/dashboard/partners", "/saas/partner"],
  ["/dashboard/afiliados", "/saas/affiliates"],
  ["/dashboard/loyalty", "/saas/loyalty"],
  ["/dashboard/local-growth", "/os/packs/local-business-growth"],
  ["/dashboard/ecommerce-growth", "/os/packs/ecommerce-growth"],
  ["/dashboard/saas-b2b-growth", "/os/packs/saas-b2b-growth"],
  ["/dashboard/analytics", "/saas/reportes"],
  ["/dashboard/cursos", "/saas/lms"],
  ["/dashboard/ia", "/saas/agentes"],
  ["/dashboard/live-chat", "/saas/inbox"],
  ["/dashboard/social-scheduler", "/saas/social"],
  ["/dashboard/social-monitoring", "/saas/social"],
  ["/dashboard/reservas", "/saas/citas"],
  ["/dashboard/api-keys", "/saas/api-keys"],
  ["/dashboard/api-docs", "/saas/integraciones"],
  ["/dashboard/storage", "/saas/settings"],
  ["/dashboard/history", "/saas/audit"],
  ["/dashboard/executive-reports", "/saas/reportes"],
  ["/dashboard/webinars", "/saas/campanias"],
  ["/dashboard/cdp", "/saas/crm"],
  ["/dashboard/ai-model", "/saas/agentes"],
  ["/dashboard/funnels", "/saas/funnels"],
  ["/dashboard/stores", "/saas/store"],
];

export function resolveDashboardLegacyRedirect(pathname: string): string | null {
  if (pathname === "/dashboard" || pathname === "/dashboard/") {
    return "/saas/dashboard";
  }
  if (!pathname.startsWith("/dashboard/")) return null;
  for (const [prefix, dest] of DASHBOARD_PREFIX_REDIRECTS) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) return dest;
  }
  return "/saas/dashboard";
}
