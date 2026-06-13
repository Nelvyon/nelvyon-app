/** Central titles + document titles for authenticated product routes. */
import { BrandMode, getBrandAppName, getBrandMode } from "@/core/platform/brand";
import { isPathAllowed } from "@/core/platform/surfacePolicy";

export interface RoutePageMeta {
  documentTitle: string;
  heading: string;
  description?: string;
}

const DEFAULT_META: RoutePageMeta = {
  documentTitle: "NELVYON",
  heading: "Workspace",
  description: undefined,
};

export function getRoutePageMeta(pathname: string, mode: BrandMode = getBrandMode()): RoutePageMeta {
  const path = pathname || "";
  const appName = getBrandAppName(mode);

  if (mode === "client" && !isPathAllowed(path, mode)) {
    return {
      documentTitle: `Internal area · ${appName}`,
      heading: "Internal area",
      description: "This section is reserved for private backoffice operations.",
    };
  }

  if (path === "/" || path === "") {
    if (mode === "client") {
      return {
        documentTitle: `${appName} — Home`,
        heading: appName,
        description: "Client workspace with only the sections explicitly enabled for your account.",
      };
    }
    return {
      documentTitle: "NELVYON — Home",
      heading: "NELVYON",
      description: "Activation checklist and shortcuts to workspace modules.",
    };
  }

  if (path === "/sign-in") {
    return {
      documentTitle: `Sign in (staging) · ${appName}`,
      heading: "Session (staging)",
      description: "Paste a short-lived API JWT for demo or staging. Not the final OIDC product login.",
    };
  }
  if (path === "/auth/signup") {
    return {
      documentTitle: `Client signup v1 · ${appName}`,
      heading: "Client signup v1",
      description: "Create basic client access and continue with workspace selection.",
    };
  }

  if (mode === "client") {
    if (path === "/client/sign-in") {
      return {
        documentTitle: `Client access · ${appName}`,
        heading: "Client access",
        description: "Secure entry point for client portal authentication.",
      };
    }
    if (path === "/account") {
      return {
        documentTitle: `Account · ${appName}`,
        heading: "Account",
        description: "Read-only profile, access, and recent activity for this client portal account.",
      };
    }
    if (path === "/billing") {
      return {
        documentTitle: `Billing · ${appName}`,
        heading: "Billing",
        description: "Read-only billing overview for your account: plan snapshot, usage, and invoices.",
      };
    }
    if (path === "/inbox/tickets") {
      return {
        documentTitle: `Requests · ${appName}`,
        heading: "Requests",
        description: "Track your active requests and delivery conversations.",
      };
    }
    const ticketDetail = path.match(/^\/inbox\/tickets\/(\d+)$/);
    if (ticketDetail) {
      const id = ticketDetail[1];
      return {
        documentTitle: `Request #${id} · ${appName}`,
        heading: `Request #${id}`,
        description: "Review request details and updates shared with your account.",
      };
    }
    if (path === "/inbox/tickets/new") {
      return {
        documentTitle: `New request · ${appName}`,
        heading: "New request",
        description: "Submit a new support or delivery request to your account team.",
      };
    }
    if (path === "/campaigns") {
      return {
        documentTitle: `Projects · ${appName}`,
        heading: "Projects",
        description: "Review project progress and current delivery status.",
      };
    }
    const campaignDetail = path.match(/^\/campaigns\/(\d+)$/);
    if (campaignDetail) {
      const id = campaignDetail[1];
      return {
        documentTitle: `Project #${id} · ${appName}`,
        heading: `Project #${id}`,
        description: "Review project status, notes, and delivery context.",
      };
    }
    if (path.startsWith("/help")) {
      return {
        documentTitle: `Support · ${appName}`,
        heading: "Support",
        description: "Guides and support actions enabled for your portal scope.",
      };
    }
  }

  if (path === "/crm/clients") {
    return {
      documentTitle: "Clientes · Revenue · NELVYON",
      heading: "Clientes",
      description: "Cuentas de revenue de este workspace: enlaza deals y pipeline desde la lista o el detalle.",
    };
  }
  if (path === "/crm/clients/new") {
    return {
      documentTitle: "Nuevo cliente · Revenue · NELVYON",
      heading: "Nuevo cliente",
      description: "Crea un perfil de cliente para conectar deals, campañas y entregables.",
    };
  }
  const clientDetail = path.match(/^\/crm\/clients\/(\d+)$/);
  if (clientDetail) {
    const id = clientDetail[1];
    return {
      documentTitle: `Cliente #${id} · Revenue · NELVYON`,
      heading: `Cliente #${id}`,
      description: "Revisa la cuenta, accede a sus deals y actualiza los campos permitidos por tu rol.",
    };
  }
  if (path === "/crm/deals") {
    return {
      documentTitle: "Deals · Revenue · NELVYON",
      heading: "Pipeline comercial",
      description: "Etapas, responsables, clientes vinculados y seguimiento comercial del workspace.",
    };
  }
  const dealDetail = path.match(/^\/crm\/deals\/(\d+)$/);
  if (dealDetail) {
    const id = dealDetail[1];
    return {
      documentTitle: `Deal #${id} · Revenue · NELVYON`,
      heading: `Deal #${id}`,
      description: "Deal card: client context, stage, owner, next step, and follow-up activity.",
    };
  }

  if (path === "/inbox/tickets") {
    return {
      documentTitle: "Tickets · Helpdesk · NELVYON",
      heading: "Tickets de soporte",
      description: "Cola unificada de solicitudes y conversaciones del workspace.",
    };
  }
  if (path === "/inbox/tickets/new") {
    return {
      documentTitle: "Nuevo ticket · Helpdesk · NELVYON",
      heading: "Nuevo ticket",
      description: "Registra una solicitud para que tu equipo la gestione.",
    };
  }
  const ticketDetail = path.match(/^\/inbox\/tickets\/(\d+)$/);
  if (ticketDetail) {
    const id = ticketDetail[1];
    return {
      documentTitle: `Ticket #${id} · Inbox · NELVYON`,
      heading: `Ticket #${id}`,
      description: "Track status and keep stakeholders aligned.",
    };
  }

  if (path === "/campaigns") {
    return {
      documentTitle: "Campañas · NELVYON",
      heading: "Campañas",
      description: "Campañas del workspace con contexto de entrega y estado del ciclo de vida.",
    };
  }
  if (path === "/campaigns/new") {
    return {
      documentTitle: "Nueva campaña · NELVYON",
      heading: "Nueva campaña",
      description: "Inicia una campaña vinculada a un proyecto y, opcionalmente, a un cliente.",
    };
  }
  const campaignDetail = path.match(/^\/campaigns\/(\d+)$/);
  if (campaignDetail) {
    const id = campaignDetail[1];
    return {
      documentTitle: `Campaign #${id} · NELVYON`,
      heading: `Campaign #${id}`,
      description: "Review performance signals and adjust fields your role can edit.",
    };
  }

  if (path === "/automations/jobs") {
    return {
      documentTitle: "Jobs de automatización · NELVYON",
      heading: "Jobs de automatización",
      description: "Trabajos en segundo plano generados para este workspace.",
    };
  }
  const jobDetail = path.match(/^\/automations\/jobs\/(\d+)$/);
  if (jobDetail) {
    const id = jobDetail[1];
    return {
      documentTitle: `Job #${id} · Automations · NELVYON`,
      heading: `Automation job #${id}`,
      description: "Inspect output, errors, and retry when your role allows.",
    };
  }

  if (path === "/automations/webhooks") {
    return {
      documentTitle: "Webhooks · Automations · NELVYON",
      heading: "Automation webhooks",
      description: "Inbound automation entry points scoped to this workspace.",
    };
  }
  const webhookDetail = path.match(/^\/automations\/webhooks\/(\d+)$/);
  if (webhookDetail) {
    const id = webhookDetail[1];
    return {
      documentTitle: `Webhook #${id} · Automations · NELVYON`,
      heading: `Webhook #${id}`,
      description: "Review keys, activity counters, and activation state.",
    };
  }

  if (path === "/billing") {
    return {
      documentTitle: "Billing · NELVYON",
      heading: "Billing",
      description: "Plan, usage risk, invoices, and lightweight exports for this workspace.",
    };
  }
  if (path === "/billing/upgrade") {
    return {
      documentTitle: "Upgrade plan · NELVYON",
      heading: "Upgrade plan",
      description: "Workspace-scoped self-serve checkout and verification flow.",
    };
  }

  if (path === "/settings") {
    return {
      documentTitle: "Workspace settings · NELVYON",
      heading: "Workspace settings",
      description: "Branding, timezone, and people access for this tenant.",
    };
  }
  if (path === "/settings/audit") {
    return {
      documentTitle: "Audit & security · Settings · NELVYON",
      heading: "Audit & security",
      description: "Recent workspace events for confidence and operational traceability.",
    };
  }
  const settingsAuditDetail = path.match(/^\/settings\/audit\/(\d+)$/);
  if (settingsAuditDetail) {
    const id = settingsAuditDetail[1];
    return {
      documentTitle: `Security event #${id} · Settings · NELVYON`,
      heading: `Security event #${id}`,
      description: "Workspace-scoped security event detail and payload for operational review.",
    };
  }

  if (path === "/os/dashboard") {
    return {
      documentTitle: "NELVYON OS — Dashboard",
      heading: "Dashboard operativo",
      description: "KPIs internos nelvyon_* y automatización (sin datos simulados).",
    };
  }
  if (path === "/os/clientes" || path.startsWith("/os/clientes/")) {
    if (path.endsWith("/nuevo")) {
      return { documentTitle: "Nuevo cliente · NELVYON OS", heading: "Nuevo cliente", description: "os_clients" };
    }
    if (/\/clientes\/[^/]+/.test(path) && !path.endsWith("/nuevo")) {
      return { documentTitle: "Cliente · NELVYON OS", heading: "Detalle cliente", description: "os_clients" };
    }
    return { documentTitle: "Clientes · NELVYON OS", heading: "Clientes", description: "os_clients" };
  }
  if (path === "/os/proyectos" || path.startsWith("/os/proyectos/")) {
    if (path.endsWith("/nuevo")) {
      return { documentTitle: "Nuevo proyecto · NELVYON OS", heading: "Nuevo proyecto", description: "os_projects" };
    }
    if (/\/proyectos\/[^/]+/.test(path) && !path.endsWith("/nuevo")) {
      return { documentTitle: "Proyecto · NELVYON OS", heading: "Detalle proyecto", description: "os_projects" };
    }
    return { documentTitle: "Proyectos · NELVYON OS", heading: "Proyectos", description: "os_projects" };
  }
  if (path === "/os/pipeline" || path.startsWith("/os/pipeline/")) {
    if (path.endsWith("/nuevo")) {
      return {
        documentTitle: "Nueva oportunidad · NELVYON OS",
        heading: "Nueva oportunidad",
        description: "os_deals",
      };
    }
    if (/\/pipeline\/\d+/.test(path)) {
      return {
        documentTitle: "Oportunidad · NELVYON OS",
        heading: "Detalle oportunidad",
        description: "os_deals",
      };
    }
    return {
      documentTitle: "Pipeline · NELVYON OS",
      heading: "Pipeline interno",
      description: "os_deals",
    };
  }
  if (path === "/os/tareas" || path.startsWith("/os/tareas/")) {
    if (path.endsWith("/nuevo")) {
      return {
        documentTitle: "Nueva tarea · NELVYON OS",
        heading: "Nueva tarea",
        description: "os_tasks",
      };
    }
    if (/\/tareas\/[^/]+/.test(path) && !path.endsWith("/nuevo")) {
      return {
        documentTitle: "Tarea · NELVYON OS",
        heading: "Detalle tarea",
        description: "os_tasks",
      };
    }
    return {
      documentTitle: "Tareas · NELVYON OS",
      heading: "Tareas operativas",
      description: "os_tasks",
    };
  }
  if (path === "/os/entregables" || path.startsWith("/os/entregables/")) {
    if (path.endsWith("/nuevo")) {
      return {
        documentTitle: "Nuevo entregable · NELVYON OS",
        heading: "Nuevo entregable",
        description: "os_deliverables",
      };
    }
    if (/\/entregables\/[^/]+/.test(path) && !path.endsWith("/nuevo")) {
      return {
        documentTitle: "Entregable · NELVYON OS",
        heading: "Detalle entregable",
        description: "os_deliverables",
      };
    }
    return {
      documentTitle: "Entregables · NELVYON OS",
      heading: "Entregables",
      description: "os_deliverables",
    };
  }
  if (path === "/os/documentos" || path.startsWith("/os/documentos/")) {
    if (/\/documentos\/(entrega|archivo|contrato|factura)\/\d+/.test(path)) {
      return {
        documentTitle: "Documento · NELVYON OS",
        heading: "Detalle documento",
        description: "nelvyon_outputs · nelvyon_assets · contracts",
      };
    }
    return {
      documentTitle: "Documentos · NELVYON OS",
      heading: "Documentos y entregas",
      description: "Vista unificada OS",
    };
  }
  if (path === "/os/finanzas") {
    return {
      documentTitle: "Finanzas · NELVYON OS",
      heading: "Finanzas operativas",
      description: "invoices · contracts · os_deals · billing",
    };
  }
  if (path === "/os/ia" || path === "/os/configuracion") {
    return {
      documentTitle: "NELVYON OS",
      heading: path === "/os/ia" ? "IA operativa" : "Configuración",
      description: "Enlaces a rutas operativas existentes.",
    };
  }
  if (path === "/os") {
    return {
      documentTitle: "Operations · NELVYON",
      heading: "Operations",
      description: "Automation snapshot, webhooks, playbook CTAs, job samples, and optional billing risk.",
    };
  }
  if (path === "/os/observability") {
    return {
      documentTitle: "Health & SLO snapshot · Operations · NELVYON",
      heading: "Health & SLO snapshot",
      description: "24h operational snapshot: 5xx rate, p95 latency, failed jobs, and queue backlog with OK/WARN/CRIT.",
    };
  }
  if (path === "/os/observability/incidents") {
    return {
      documentTitle: "Incident drilldown · Operations · NELVYON",
      heading: "Incident drilldown",
      description: "Top failing endpoints and job types with correlation ids and a runbook CTA.",
    };
  }
  if (path === "/os/observability/alerts") {
    return {
      documentTitle: "Alert rule guardrails · Operations · NELVYON",
      heading: "Alert rule guardrails",
      description: "Read-only alert simulation for 5xx ratio, job failures, and queue backlog without external pager wiring.",
    };
  }
  if (path === "/os/autonomous/learning") {
    return {
      documentTitle: "Learning Engine · NELVYON OS",
      heading: "Learning Engine",
      description:
        "Internal template rankings, conversion metrics, and portal feedback — operator+ only, no client PII.",
    };
  }
  if (path === "/os/global") {
    return {
      documentTitle: "Cross-workspace operations snapshot · NELVYON",
      heading: "Cross-workspace operations snapshot",
      description: "24h internal rollup across workspaces: 5xx ratio, p95 latency, failed jobs, and queue backlog.",
    };
  }
  if (path === "/os/global/risk-queue") {
    return {
      documentTitle: "Workspace risk queue · NELVYON",
      heading: "Workspace risk queue",
      description: "Prioritized warn/crit workspace queue with direct links to existing operational drilldowns.",
    };
  }
  if (path === "/os/global/change-journal") {
    return {
      documentTitle: "Operational change journal · NELVYON",
      heading: "Operational change journal",
      description: "Read-only consolidated timeline from existing operational change logs.",
    };
  }
  if (path === "/os/qa/checklist") {
    return {
      documentTitle: "QA core checklist · Excellence · NELVYON",
      heading: "QA core checklist",
      description: "Read-only checklist for core flow quality status and evidence references.",
    };
  }
  if (path === "/os/i18n") {
    return {
      documentTitle: "i18n baseline status · Excellence · NELVYON",
      heading: "i18n baseline status",
      description: "Default locale, enabled locales, critical module coverage, and hardcoded hotspot inventory.",
    };
  }
  if (path === "/os/excellence/golden-path") {
    return {
      documentTitle: "Golden path gate · Excellence · NELVYON",
      heading: "Golden path gate",
      description: "Operational definition of required checks before a change is considered ready.",
    };
  }
  if (path === "/os/design-system") {
    return {
      documentTitle: "Design System v1 · Operations · NELVYON",
      heading: "Design System v1",
      description: "NELVYON tokens and core primitives — internal reference; production UI remains on existing components until migration.",
    };
  }
  if (path === "/os/web-premium/preview") {
    return {
      documentTitle: "Web Premium template preview · Operations · NELVYON",
      heading: "Web Premium template preview",
      description:
        "Reusable OS marketing shell: hero, about, services, CTA, footer, SEO helpers, lazy media, delivery checklist.",
    };
  }
  if (path === "/os/ecommerce-premium/preview") {
    return {
      documentTitle: "E‑commerce Premium template · Catalog · NELVYON",
      heading: "E‑commerce Premium catalog",
      description: "Template PLP — product listing, conversion tiles, and OS delivery checklist.",
    };
  }
  if (path === "/os/ecommerce-premium/preview/checkout") {
    return {
      documentTitle: "E‑commerce Premium template · Checkout · NELVYON",
      heading: "E‑commerce Premium checkout",
      description: "Demo checkout layout — fields and summary only; no PSP or inventory.",
    };
  }
  const ecommercePdp = path.match(/^\/os\/ecommerce-premium\/preview\/p\/([^/]+)$/);
  if (ecommercePdp) {
    const slug = ecommercePdp[1];
    return {
      documentTitle: `Product (${slug}) · E‑commerce Premium · NELVYON`,
      heading: "Product detail",
      description: `Template PDP for slug “${slug}” with product-level Open Graph metadata.`,
    };
  }
  if (path === "/os/seo-premium/preview") {
    return {
      documentTitle: "SEO Premium audit template · Operations · NELVYON",
      heading: "SEO Premium audit",
      description:
        "Technical, on-page, content, interlinking, CWV, and reporting sections with pass/warn/fail/pending and P1–P3 priorities.",
    };
  }
  if (path === "/os/ads-premium/preview") {
    return {
      documentTitle: "Ads Premium campaign template · Operations · NELVYON",
      heading: "Ads Premium campaign",
      description:
        "Tracking, creatives, copy, targeting, budget, optimization, and reporting with governance shortcuts — no Ads APIs.",
    };
  }
  if (path === "/os/branding-premium/preview") {
    return {
      documentTitle: "Branding Premium project template · Operations · NELVYON",
      heading: "Branding Premium project",
      description:
        "Identity, typography, color, voice, applications, and brandbook deliverables with policy links — no design APIs.",
    };
  }
  if (path === "/os/voz-premium/preview") {
    return {
      documentTitle: "Voz Premium delivery template · Operations · NELVYON",
      heading: "Voz Premium delivery",
      description:
        "Voice OS handoff layered on VOZ v2 pilot — agent, quality, script, locales, handoff, reporting — no voice API changes.",
    };
  }
  if (path === "/os/bots-premium/preview") {
    return {
      documentTitle: "Bots Premium delivery template · Operations · NELVYON",
      heading: "Bots Premium delivery",
      description:
        "Bot configuration, deployment channel, conversational flow, integrations, handoff, reporting — layered on closed BOTS v1; checklist only.",
    };
  }
  if (path === "/os/personal-digital-premium/preview") {
    return {
      documentTitle: "Personal Digital Premium delivery template · Operations · NELVYON",
      heading: "Personal Digital Premium delivery",
      description:
        "Profile, web, networks, content, reputation, reporting — layered on closed PERSONAL DIGITAL v1; checklist and links only.",
    };
  }
  if (path === "/os/advisor-empresarial-premium/preview") {
    return {
      documentTitle: "Advisor Empresarial Premium delivery template · Operations · NELVYON",
      heading: "Advisor Empresarial Premium delivery",
      description:
        "Diagnosis, strategy, action plan, KPIs, follow-up, deliverables — layered on closed ADVISOR EMPRESARIAL v1; checklist only.",
    };
  }
  if (path === "/os/canales-comunicaciones-premium/preview") {
    return {
      documentTitle: "Canales y Comunicaciones Premium delivery template · Operations · NELVYON",
      heading: "Canales y Comunicaciones Premium delivery",
      description:
        "Channel config, templates, segmentation, automations, deliverability, reporting — layered on closed CANALES v1; checklist only.",
    };
  }
  if (path === "/os/social-media-premium/preview") {
    return {
      documentTitle: "Social Media Premium delivery template · Operations · NELVYON",
      heading: "Social Media Premium delivery",
      description:
        "Strategy, calendar, creative, publishing, community, growth, reporting — paperwork only; no social network APIs.",
    };
  }
  if (path === "/os/influencer-marketing-premium/preview") {
    return {
      documentTitle: "Influencer Marketing Premium delivery template · Operations · NELVYON",
      heading: "Influencer Marketing Premium delivery",
      description:
        "Strategy, selection, briefing, production, publication, metrics, reporting — paperwork only; no influencer platforms or e-sign.",
    };
  }
  if (path === "/os/email-marketing-premium/preview") {
    return {
      documentTitle: "Email Marketing Premium delivery template · Operations · NELVYON",
      heading: "Email Marketing Premium delivery",
      description:
        "Strategy, templates, copy, automations, deliverability, metrics — paperwork only; no ESP or send APIs.",
    };
  }
  if (path === "/os/contenido-copywriting-premium/preview") {
    return {
      documentTitle: "Contenido y Copywriting Premium delivery template · Operations · NELVYON",
      heading: "Contenido y Copywriting Premium delivery",
      description:
        "Strategy, voice, calendar, copy, review, SEO on-page, deliverables — paperwork only; no generative content APIs.",
    };
  }
  if (path === "/os/video-multimedia-premium/preview") {
    return {
      documentTitle: "Video y Multimedia Premium delivery template · Operations · NELVYON",
      heading: "Video y Multimedia Premium delivery",
      description:
        "Brief, production, edit, mograph, subtitles, delivery, reporting — paperwork only; no transcode, CDN, or render APIs.",
    };
  }
  if (path === "/os/3d-inmersivo-premium/preview") {
    return {
      documentTitle: "3D y Contenido Inmersivo Premium delivery template · Operations · NELVYON",
      heading: "3D y Contenido Inmersivo Premium delivery",
      description:
        "Brief, modeling, materials, animation, optimization, delivery, reporting — paperwork only; no 3D engines, render farms, or WebXR APIs.",
    };
  }
  if (path === "/os/fotografia-producto-premium/preview") {
    return {
      documentTitle: "Fotografía de Producto Premium delivery template · Operations · NELVYON",
      heading: "Fotografía de Producto Premium delivery",
      description:
        "Brief, session, selection, retouch, web optimization, delivery, reporting — paperwork only; no storage, DAM, or CDN APIs.",
    };
  }
  if (path === "/os/diseno-grafico-premium/preview") {
    return {
      documentTitle: "Diseño gráfico y creatividades Premium delivery template · Operations · NELVYON",
      heading: "Diseño gráfico y creatividades Premium delivery",
      description:
        "Brief, sketches, composition, review, adaptations, delivery, reporting — paperwork only; no Figma, Adobe, or asset CDN APIs.",
    };
  }
  if (path === "/os/consultoria-automatizacion-premium/preview") {
    return {
      documentTitle: "Consultoría de automatización Premium delivery template · Operations · NELVYON",
      heading: "Consultoría de automatización Premium delivery",
      description:
        "Diagnosis, flow map, design, implementation, testing, documentation, reporting — paperwork only; no live workflows or external integration APIs.",
    };
  }
  if (path === "/os/integraciones-apis-premium/preview") {
    return {
      documentTitle: "Integraciones y APIs Premium delivery template · Operations · NELVYON",
      heading: "Integraciones y APIs Premium delivery",
      description:
        "Analysis, auth, implementation, QA, documentation, monitoring, handoff — paperwork only; no live REST calls, webhooks, or third-party SDK execution.",
    };
  }
  if (path === "/os/mantenimiento-web-premium/preview") {
    return {
      documentTitle: "Mantenimiento web Premium delivery template · Operations · NELVYON",
      heading: "Mantenimiento web Premium delivery",
      description:
        "Initial audit, updates, backups, security, CWV, uptime monitoring, monthly reporting — paperwork only; no live probes, backup jobs, or external monitoring APIs.",
    };
  }
  if (path === "/os/reputacion-orm-premium/preview") {
    return {
      documentTitle: "Reputación online y ORM Premium delivery template · Operations · NELVYON",
      heading: "Reputación online y ORM Premium delivery",
      description:
        "Reputation audit, reviews, positive content, mitigation, monitoring, crisis, monthly reporting — paperwork only; no external monitoring APIs or review scraping.",
    };
  }
  if (path === "/os/formacion-capacitacion-premium/preview") {
    return {
      documentTitle: "Formación y capacitación digital Premium delivery template · Operations · NELVYON",
      heading: "Formación y capacitación digital Premium delivery",
      description:
        "Needs diagnosis, curriculum, materials, instruction, evaluation, certification, reporting — paperwork only; no LMS APIs, SCORM authoring, or live course provisioning.",
    };
  }
  if (path === "/os/logs") {
    return {
      documentTitle: "Audit logs · Operations · NELVYON",
      heading: "Audit logs",
      description: "Workspace-scoped security and audit events for internal operational tracing.",
    };
  }
  const osLogDetail = path.match(/^\/os\/logs\/(\d+)$/);
  if (osLogDetail) {
    const id = osLogDetail[1];
    return {
      documentTitle: `Audit log #${id} · Operations · NELVYON`,
      heading: `Audit log #${id}`,
      description: "Inspect a single workspace-scoped audit log record and details payload.",
    };
  }
  if (path === "/os/agents") {
    return {
      documentTitle: "Agent runs · Operations · NELVYON",
      heading: "Agent runs",
      description: "Launch predefined agent tasks and monitor queued/running/success/error states per workspace.",
    };
  }
  const osAgentDetail = path.match(/^\/os\/agents\/(\d+)$/);
  if (osAgentDetail) {
    const id = osAgentDetail[1];
    return {
      documentTitle: `Agent run #${id} · Operations · NELVYON`,
      heading: `Agent run #${id}`,
      description: "Read-only execution timeline and summarized logs for this workspace-scoped run.",
    };
  }
  const osAgentAudit = path.match(/^\/os\/agents\/(\d+)\/audit$/);
  if (osAgentAudit) {
    const id = osAgentAudit[1];
    return {
      documentTitle: `Agent run #${id} audit · Operations · NELVYON`,
      heading: `Agent run #${id} audit`,
      description: "Read-only audit trail with attempted action, result, timestamp, and workspace scope.",
    };
  }
  if (path === "/os/workspaces/select") {
    return {
      documentTitle: "Workspace selection · NELVYON",
      heading: "Workspace selection",
      description: "Pick or create a workspace for client self-service onboarding.",
    };
  }
  if (path === "/app/projects/new") {
    return {
      documentTitle: "First project wizard v1 · NELVYON",
      heading: "First project wizard v1",
      description: "Create a minimal draft project with simple fields and no automated launches.",
    };
  }
  if (path === "/app/assistant") {
    return {
      documentTitle: "Professional assistant v1 · NELVYON",
      heading: "Professional assistant v1",
      description: "Share a project request and get workspace status updates in a single guided flow.",
    };
  }
  if (path === "/app/advisor") {
    return {
      documentTitle: "Business advisor v1 · NELVYON",
      heading: "Business advisor",
      description:
        "Plan-governed growth and entrepreneurship guidance with clear next moves—linked to projects and support in your workspace.",
    };
  }
  if (path === "/app/communications") {
    return {
      documentTitle: "Channels & communications v1 · NELVYON",
      heading: "Channels and communications",
      description:
        "Transactional outbound email for confirmations and workspace activity—no voice or mass campaigns in this version.",
    };
  }
  if (path === "/app/branding") {
    return {
      documentTitle: "White-label & branding v1 · NELVYON",
      heading: "Workspace branding",
      description:
        "Logo, accent color, and public slug stored on the workspace tenant record—preview here; full domain and shell re-skin are later layers.",
    };
  }
  if (path === "/app/branding/policy") {
    return {
      documentTitle: "Tenant branding policy · White-label v2 · NELVYON",
      heading: "Tenant branding policy",
      description: "Read-only effective policy: enabled/blocked/inherited branding fields and reasons for this workspace.",
    };
  }
  if (path === "/app/branding/preview-v2") {
    return {
      documentTitle: "Tenant preview matrix · White-label v2 · NELVYON",
      heading: "Tenant preview matrix",
      description: "Local preview matrix constrained by effective tenant branding policy, without global runtime reskin.",
    };
  }
  if (path === "/os/tenants/activation") {
    return {
      documentTitle: "Tenant activation guard · White-label v2 · NELVYON",
      heading: "Tenant activation guard",
      description: "Internal operator/admin control for branding v2 advanced activation with preconditions and audit log.",
    };
  }
  if (path === "/app/voz") {
    return {
      documentTitle: "Voice (VOZ) v1 · NELVYON",
      heading: "Voice (VOZ)",
      description:
        "Plan snapshot plus honest scope: no dialer, mass calling, or full voice automation in this version—internal workspace readiness only.",
    };
  }
  if (path === "/app/voz/inbound") {
    return {
      documentTitle: "Voice inbound (VOZ v2) · NELVYON",
      heading: "Inbound voice note",
      description: "Short voice clip stored on the workspace and linked to a new helpdesk ticket—no live telephony.",
    };
  }
  if (path === "/app/voz/outbound-synth") {
    return {
      documentTitle: "Voice browser synth (VOZ v2) · NELVYON",
      heading: "Browser synth (listen)",
      description: "Local speech synthesis preview with pilot monthly quota—no paid TTS or outbound calling.",
    };
  }
  if (path === "/app/support") {
    return {
      documentTitle: "Client support v1 · NELVYON",
      heading: "Client support v1",
      description: "Basic support ticket intake and open/closed status visibility for the active workspace.",
    };
  }
  if (path === "/analytics") {
    return {
      documentTitle: "Internal reporting dashboard · NELVYON",
      heading: "Internal reporting dashboard",
      description: "Activation overview with direct links to core operational modules for this workspace.",
    };
  }
  if (path === "/analytics/revenue") {
    return {
      documentTitle: "Revenue analytics v2 · NELVYON",
      heading: "Revenue analytics v2",
      description: "Pipeline summary and deal signals from current CRM data for the active workspace.",
    };
  }
  if (path === "/analytics/revenue/deals") {
    return {
      documentTitle: "Revenue deal drilldown v2 · NELVYON",
      heading: "Revenue deal drilldown v2",
      description: "Read-only drilldown of selected deal signals from existing CRM data.",
    };
  }
  if (path === "/analytics/tickets") {
    return {
      documentTitle: "Tickets analytics v2 · NELVYON",
      heading: "Tickets analytics v2",
      description: "Read-only support queue signals and SLA heuristics from existing helpdesk rows.",
    };
  }
  if (path === "/analytics/campaigns") {
    return {
      documentTitle: "Campaigns analytics v2 · NELVYON",
      heading: "Campaigns analytics v2",
      description: "Read-only campaign status and quality signals from existing campaign rows.",
    };
  }

  if (path === "/help") {
    return {
      documentTitle: "Help center · NELVYON",
      heading: "Help center",
      description: "FAQ, how-to guides, and structured forms for bug/help/feedback.",
    };
  }
  const helpModule = path.match(/^\/help\/([a-z_]+)$/);
  if (helpModule) {
    const key = helpModule[1];
    return {
      documentTitle: `Help · ${key.toUpperCase()} · NELVYON`,
      heading: `Help · ${key.toUpperCase()}`,
      description: "Module-specific guidance with links to real actions.",
    };
  }

  return DEFAULT_META;
}
