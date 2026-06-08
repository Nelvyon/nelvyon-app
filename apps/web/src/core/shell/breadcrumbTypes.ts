import { BrandMode, getBrandMode } from "@/core/platform/brand";

export interface BreadcrumbItem {
  key: string;
  label: string;
  href?: string;
}

/** Simple trail for wayfinding; module roots link to sensible defaults. */
export function getBreadcrumbs(pathname: string, mode: BrandMode = getBrandMode()): BreadcrumbItem[] {
  const path = pathname || "";
  const items: BreadcrumbItem[] = [];

  if (mode === "client") {
    if (path.startsWith("/account")) {
      items.push({ key: "account", label: "Account", href: "/account" });
      return items;
    }
    if (path.startsWith("/inbox")) {
      items.push({ key: "requests", label: "Requests", href: "/inbox/tickets" });
      if (path === "/inbox/tickets") return items;
      const m = path.match(/^\/inbox\/tickets\/(\d+)$/);
      if (m) items.push({ key: "detail", label: `Request #${m[1]}` });
      return items;
    }
    if (path.startsWith("/campaigns")) {
      items.push({ key: "projects", label: "Projects", href: "/campaigns" });
      if (path === "/campaigns") return items;
      const m = path.match(/^\/campaigns\/(\d+)$/);
      if (m) items.push({ key: "detail", label: `Project #${m[1]}` });
      return items;
    }
    if (path.startsWith("/help")) {
      items.push({ key: "support", label: "Support", href: "/help" });
      return items;
    }
  }

  if (path.startsWith("/crm")) {
    items.push({ key: "revenue", label: "Revenue", href: "/crm/clients" });
    if (path === "/crm/deals") {
      items.push({ key: "deals", label: "Deals" });
      return items;
    }
    const dm = path.match(/^\/crm\/deals\/(\d+)$/);
    if (dm) {
      items.push({ key: "deals", label: "Deals", href: "/crm/deals" });
      items.push({ key: "deal-detail", label: `Deal #${dm[1]}` });
      return items;
    }
    if (path === "/crm/clients") {
      items.push({ key: "clients", label: "Clients" });
      return items;
    }
    items.push({ key: "clients", label: "Clients", href: "/crm/clients" });
    if (path === "/crm/clients/new") {
      items.push({ key: "new", label: "New" });
      return items;
    }
    const m = path.match(/^\/crm\/clients\/(\d+)$/);
    if (m) {
      items.push({ key: "detail", label: `Client #${m[1]}` });
    }
    return items;
  }

  if (path.startsWith("/inbox")) {
    items.push({ key: "inbox", label: "Inbox", href: "/inbox/tickets" });
    if (path === "/inbox/tickets") {
      items.push({ key: "tickets", label: "Tickets" });
      return items;
    }
    items.push({ key: "tickets", label: "Tickets", href: "/inbox/tickets" });
    if (path === "/inbox/tickets/new") {
      items.push({ key: "new", label: "New" });
      return items;
    }
    const m = path.match(/^\/inbox\/tickets\/(\d+)$/);
    if (m) {
      items.push({ key: "detail", label: `Ticket #${m[1]}` });
    }
    return items;
  }

  if (path.startsWith("/campaigns")) {
    items.push({ key: "campaigns", label: "Campaigns", href: "/campaigns" });
    if (path === "/campaigns") return items;
    if (path === "/campaigns/new") {
      items.push({ key: "new", label: "New" });
      return items;
    }
    const m = path.match(/^\/campaigns\/(\d+)$/);
    if (m) {
      items.push({ key: "detail", label: `Campaign #${m[1]}` });
    }
    return items;
  }

  if (path.startsWith("/automations")) {
    items.push({ key: "auto", label: "Automations", href: "/automations/jobs" });
    if (path.startsWith("/automations/jobs")) {
      items.push({ key: "jobs", label: "Jobs", href: "/automations/jobs" });
      if (path === "/automations/jobs") return items;
      const m = path.match(/^\/automations\/jobs\/(\d+)$/);
      if (m) items.push({ key: "job", label: `Job #${m[1]}` });
      return items;
    }
    if (path.startsWith("/automations/webhooks")) {
      items.push({ key: "hooks", label: "Webhooks", href: "/automations/webhooks" });
      if (path === "/automations/webhooks") return items;
      const m = path.match(/^\/automations\/webhooks\/(\d+)$/);
      if (m) items.push({ key: "hook", label: `Webhook #${m[1]}` });
    }
    return items;
  }

  if (path.startsWith("/billing")) {
    items.push({ key: "billing", label: "Billing", href: "/billing" });
    if (path === "/billing/upgrade") {
      items.push({ key: "upgrade", label: "Upgrade" });
    }
    return items;
  }

  if (path.startsWith("/settings")) {
    items.push({ key: "settings", label: "Settings", href: "/settings" });
    if (path === "/settings/audit") {
      items.push({ key: "audit", label: "Audit & security" });
      return items;
    }
    const auditDetail = path.match(/^\/settings\/audit\/(\d+)$/);
    if (auditDetail) {
      items.push({ key: "audit", label: "Audit & security", href: "/settings/audit" });
      items.push({ key: "audit-event", label: `Event #${auditDetail[1]}` });
      return items;
    }
    return items;
  }

  if (path.startsWith("/os")) {
    items.push({ key: "os", label: "Operations", href: "/os" });
    if (path === "/os/qa/checklist") {
      items.push({ key: "os-qa-checklist", label: "QA checklist" });
      return items;
    }
    if (path === "/os/i18n") {
      items.push({ key: "os-i18n", label: "i18n" });
      return items;
    }
    if (path === "/os/excellence/golden-path") {
      items.push({ key: "os-excellence", label: "Excellence", href: "/os" });
      items.push({ key: "os-excellence-golden-path", label: "Golden path" });
      return items;
    }
    if (path === "/os/design-system") {
      items.push({ key: "os-design-system", label: "Design System v1" });
      return items;
    }
    if (path === "/os/web-premium/preview") {
      items.push({ key: "os-web-premium-preview", label: "Web Premium preview" });
      return items;
    }
    if (path === "/os/ecommerce-premium/preview") {
      items.push({ key: "os-eco-premium-catalog", label: "E‑commerce Premium" });
      return items;
    }
    if (path === "/os/ecommerce-premium/preview/checkout") {
      items.push({ key: "os-eco-premium-catalog", label: "E‑commerce Premium", href: "/os/ecommerce-premium/preview" });
      items.push({ key: "os-eco-premium-checkout", label: "Checkout" });
      return items;
    }
    const ecoPdp = path.match(/^\/os\/ecommerce-premium\/preview\/p\/([^/]+)$/);
    if (ecoPdp) {
      items.push({ key: "os-eco-premium-catalog", label: "E‑commerce Premium", href: "/os/ecommerce-premium/preview" });
      items.push({ key: "os-eco-premium-pdp", label: `Product (${ecoPdp[1]})` });
      return items;
    }
    if (path === "/os/seo-premium/preview") {
      items.push({ key: "os-seo-premium-preview", label: "SEO Premium audit" });
      return items;
    }
    if (path === "/os/ads-premium/preview") {
      items.push({ key: "os-ads-premium-preview", label: "Ads Premium campaign" });
      return items;
    }
    if (path === "/os/branding-premium/preview") {
      items.push({ key: "os-branding-premium-preview", label: "Branding Premium project" });
      return items;
    }
    if (path === "/os/voz-premium/preview") {
      items.push({ key: "os-voz-premium-preview", label: "Voz Premium delivery" });
      return items;
    }
    if (path === "/os/bots-premium/preview") {
      items.push({ key: "os-bots-premium-preview", label: "Bots Premium delivery" });
      return items;
    }
    if (path === "/os/personal-digital-premium/preview") {
      items.push({ key: "os-personal-digital-premium-preview", label: "Personal Digital Premium delivery" });
      return items;
    }
    if (path === "/os/advisor-empresarial-premium/preview") {
      items.push({ key: "os-advisor-empresarial-premium-preview", label: "Advisor Empresarial Premium delivery" });
      return items;
    }
    if (path === "/os/canales-comunicaciones-premium/preview") {
      items.push({ key: "os-canales-comunicaciones-premium-preview", label: "Canales y Comunicaciones Premium delivery" });
      return items;
    }
    if (path === "/os/social-media-premium/preview") {
      items.push({ key: "os-social-media-premium-preview", label: "Social Media Premium delivery" });
      return items;
    }
    if (path === "/os/email-marketing-premium/preview") {
      items.push({ key: "os-email-marketing-premium-preview", label: "Email Marketing Premium delivery" });
      return items;
    }
    if (path === "/os/contenido-copywriting-premium/preview") {
      items.push({ key: "os-contenido-copywriting-premium-preview", label: "Contenido y Copywriting Premium delivery" });
      return items;
    }
    if (path === "/os/video-multimedia-premium/preview") {
      items.push({ key: "os-video-multimedia-premium-preview", label: "Video y Multimedia Premium delivery" });
      return items;
    }
    if (path === "/os/3d-inmersivo-premium/preview") {
      items.push({ key: "os-3d-inmersivo-premium-preview", label: "3D y Contenido Inmersivo Premium delivery" });
      return items;
    }
    if (path === "/os/fotografia-producto-premium/preview") {
      items.push({ key: "os-fotografia-producto-premium-preview", label: "Fotografía de Producto Premium delivery" });
      return items;
    }
    if (path === "/os/diseno-grafico-premium/preview") {
      items.push({ key: "os-diseno-grafico-premium-preview", label: "Diseño gráfico y creatividades Premium delivery" });
      return items;
    }
    if (path === "/os/consultoria-automatizacion-premium/preview") {
      items.push({ key: "os-consultoria-automatizacion-premium-preview", label: "Consultoría de automatización Premium delivery" });
      return items;
    }
    if (path === "/os/integraciones-apis-premium/preview") {
      items.push({ key: "os-integraciones-apis-premium-preview", label: "Integraciones y APIs Premium delivery" });
      return items;
    }
    if (path === "/os/mantenimiento-web-premium/preview") {
      items.push({ key: "os-mantenimiento-web-premium-preview", label: "Mantenimiento web Premium delivery" });
      return items;
    }
    if (path === "/os/reputacion-orm-premium/preview") {
      items.push({ key: "os-reputacion-orm-premium-preview", label: "Reputación online y ORM Premium delivery" });
      return items;
    }
    if (path === "/os/formacion-capacitacion-premium/preview") {
      items.push({ key: "os-formacion-capacitacion-premium-preview", label: "Formación y capacitación digital Premium delivery" });
      return items;
    }
    if (path === "/os/influencer-marketing-premium/preview") {
      items.push({ key: "os-influencer-marketing-premium-preview", label: "Influencer Marketing Premium delivery" });
      return items;
    }
    if (path === "/os/global") {
      items.push({ key: "os-global", label: "Global" });
      return items;
    }
    if (path === "/os/global/risk-queue") {
      items.push({ key: "os-global", label: "Global", href: "/os/global" });
      items.push({ key: "os-global-risk", label: "Risk queue" });
      return items;
    }
    if (path === "/os/global/change-journal") {
      items.push({ key: "os-global", label: "Global", href: "/os/global" });
      items.push({ key: "os-global-journal", label: "Change journal" });
      return items;
    }
    if (path === "/os/tenants/activation") {
      items.push({ key: "os-tenants-activation", label: "Tenant activation" });
      return items;
    }
    if (path === "/os/observability") {
      items.push({ key: "os-observability", label: "Observability" });
      return items;
    }
    if (path === "/os/observability/incidents") {
      items.push({ key: "os-observability", label: "Observability", href: "/os/observability" });
      items.push({ key: "os-observability-incidents", label: "Incidents" });
      return items;
    }
    if (path === "/os/observability/alerts") {
      items.push({ key: "os-observability", label: "Observability", href: "/os/observability" });
      items.push({ key: "os-observability-alerts", label: "Alerts" });
      return items;
    }
    if (path === "/os/autonomous/learning") {
      items.push({ key: "os-autonomous-learning", label: "Learning Engine" });
      return items;
    }
    if (path === "/os/workspaces/select") {
      items.push({ key: "workspace-select", label: "Workspace selection" });
      return items;
    }
    if (path === "/os/agents") {
      items.push({ key: "agents", label: "Agent runs" });
      return items;
    }
    const agentDetail = path.match(/^\/os\/agents\/(\d+)$/);
    if (agentDetail) {
      items.push({ key: "agents", label: "Agent runs", href: "/os/agents" });
      items.push({ key: "agent-detail", label: `Agent run #${agentDetail[1]}` });
      return items;
    }
    const agentAudit = path.match(/^\/os\/agents\/(\d+)\/audit$/);
    if (agentAudit) {
      items.push({ key: "agents", label: "Agent runs", href: "/os/agents" });
      items.push({ key: "agent-detail", label: `Agent run #${agentAudit[1]}`, href: `/os/agents/${agentAudit[1]}` });
      items.push({ key: "agent-audit", label: "Audit trail" });
      return items;
    }
    if (path === "/os/logs") {
      items.push({ key: "logs", label: "Audit logs" });
      return items;
    }
    const logDetail = path.match(/^\/os\/logs\/(\d+)$/);
    if (logDetail) {
      items.push({ key: "logs", label: "Audit logs", href: "/os/logs" });
      items.push({ key: "log-detail", label: `Audit log #${logDetail[1]}` });
      return items;
    }
    return items;
  }

  if (path === "/analytics") {
    items.push({ key: "analytics", label: "Reporting" });
    return items;
  }
  if (path.startsWith("/analytics/")) {
    items.push({ key: "analytics", label: "Reporting", href: "/analytics" });
    if (path === "/analytics/revenue") {
      items.push({ key: "analytics-revenue", label: "Revenue analytics v2" });
      return items;
    }
    if (path === "/analytics/revenue/deals") {
      items.push({ key: "analytics-revenue", label: "Revenue analytics v2", href: "/analytics/revenue" });
      items.push({ key: "analytics-revenue-deal", label: "Deal drilldown v2" });
    }
    if (path === "/analytics/tickets") {
      items.push({ key: "analytics-tickets", label: "Tickets analytics v2" });
      return items;
    }
    if (path === "/analytics/campaigns") {
      items.push({ key: "analytics-campaigns", label: "Campaigns analytics v2" });
      return items;
    }
    return items;
  }
  if (path.startsWith("/app/projects")) {
    items.push({ key: "app-projects", label: "Projects" });
    if (path === "/app/projects/new") {
      items.push({ key: "app-projects-new", label: "New" });
    }
    return items;
  }
  if (path === "/app/assistant") {
    items.push({ key: "app-assistant", label: "Assistant" });
    return items;
  }
  if (path === "/app/advisor") {
    items.push({ key: "app-advisor", label: "Advisor" });
    return items;
  }
  if (path === "/app/communications") {
    items.push({ key: "app-communications", label: "Communications" });
    return items;
  }
  if (path === "/app/branding") {
    items.push({ key: "app-branding", label: "Branding" });
    return items;
  }
  if (path === "/app/branding/policy") {
    items.push({ key: "app-branding", label: "Branding", href: "/app/branding" });
    items.push({ key: "app-branding-policy", label: "Policy" });
    return items;
  }
  if (path === "/app/branding/preview-v2") {
    items.push({ key: "app-branding", label: "Branding", href: "/app/branding" });
    items.push({ key: "app-branding-preview-v2", label: "Preview v2" });
    return items;
  }
  if (path === "/app/voz") {
    items.push({ key: "app-voz", label: "Voz" });
    return items;
  }
  if (path.startsWith("/app/voz/inbound")) {
    items.push({ key: "app-voz", label: "Voz", href: "/app/voz" });
    items.push({ key: "app-voz-inbound", label: "Inbound" });
    return items;
  }
  if (path.startsWith("/app/voz/outbound-synth")) {
    items.push({ key: "app-voz", label: "Voz", href: "/app/voz" });
    items.push({ key: "app-voz-synth", label: "Browser synth" });
    return items;
  }
  if (path === "/app/support") {
    items.push({ key: "app-support", label: "Support" });
    return items;
  }

  return items;
}
