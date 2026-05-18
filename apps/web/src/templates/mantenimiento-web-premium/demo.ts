import type { MantenimientoProjectConfig } from "@/templates/mantenimiento-web-premium/types";
import { MANTENIMIENTO_WEB_PREMIUM_PREVIEW_PATH } from "@/templates/mantenimiento-web-premium/paths";

/** Demo OS handoff — illustrative only; no live monitoring or external APIs; DS v2 shell. */
export const mantenimientoWebPremiumNelvyonDemoProject: MantenimientoProjectConfig = {
  pageSeo: {
    title: "NELVYON OS — Mantenimiento web Premium delivery template (preview)",
    description:
      "Premium web maintenance checklist: audit, updates, backups, security, CWV, uptime, monthly reporting. Paperwork only — no probes or vendor APIs.",
    canonicalPath: MANTENIMIENTO_WEB_PREMIUM_PREVIEW_PATH,
    siteName: "NELVYON Mantenimiento web Premium",
    keywords: ["mantenimiento", "web", "CWV", "uptime", "NELVYON", "OS"],
    locale: "es_ES",
  },
  clientLabel: "Demo cuenta · Harborline Publishing",
  projectName: "SLA sitio editorial + tienda headless · Plantilla OS",
  projectSubtitle:
    "Estados antes de renovar contrato anual. Esta capa no programa backups ni abre incidencias reales.",
  generatedNote:
    "Plantilla v2 (Design System aplicado). Badges actualizaciones, backups, seguridad, rendimiento, uptime, SEO técnico, soporte, reporting describen trabajo — no disparan jobs.",
  sections: [
    {
      id: "initial_audit",
      module: "initial_audit",
      title: "Auditoría inicial",
      intro: "Inventario técnico y riesgos.",
      items: [
        {
          id: "stack-matrix",
          label: "Matriz stack (Next, CDN, CMS, auth) + owners",
          status: "pass",
          priority: "P1",
          types: ["actualizaciones", "seguridad", "seo_tecnico"],
          evidence: "Export estático; sin escaneo remoto desde OS.",
        },
        {
          id: "dep-debt",
          label: "Deuda npm (CVE altos) con ventana parche 14d",
          status: "warn",
          priority: "P1",
          types: ["actualizaciones", "seguridad"],
          evidence: "Dependabot/GitHub fuera de NELVYON; plantilla marca warn hasta PR merge.",
        },
      ],
    },
    {
      id: "updates_patches",
      module: "updates_patches",
      title: "Actualizaciones y parches",
      intro: "Cadencia y ventanas.",
      items: [
        {
          id: "monthly-cycle",
          label: "Ciclo mensual minor + hotfix 48h críticos",
          status: "pass",
          priority: "P1",
          types: ["actualizaciones", "soporte"],
          evidence: "CI staging externo; OS no ejecuta deploy.",
        },
        {
          id: "cms-plugins",
          label: "Plugins CMS congelados salvo QA extendido",
          status: "pending",
          priority: "P2",
          types: ["actualizaciones", "rendimiento"],
          evidence: "Pendiente lista allowlist — sin auto-update desde template.",
        },
      ],
    },
    {
      id: "backups_recovery",
      module: "backups_recovery",
      title: "Backups y recuperación",
      intro: "RPO/RTO y pruebas de restore.",
      items: [
        {
          id: "rpo-rto",
          label: "RPO 24h / RTO 4h + prueba restore trimestral",
          status: "pass",
          priority: "P1",
          types: ["backups", "soporte"],
          evidence: "Acta restore en drive cliente; sin API backup desde OS.",
        },
      ],
    },
    {
      id: "security_hardening",
      module: "security_hardening",
      title: "Seguridad y hardening",
      intro: "Superficie de ataque y headers.",
      items: [
        {
          id: "csp-hsts",
          label: "CSP report-only → enforce en Q2 + HSTS preload",
          status: "warn",
          priority: "P1",
          types: ["seguridad", "uptime"],
          evidence: "Validación en staging; sin WAF API desde checklist.",
        },
        {
          id: "tls-grade",
          label: "TLS 1.2+ y ciphers modernos en edge",
          status: "pass",
          priority: "P2",
          types: ["seguridad", "rendimiento"],
          evidence: "SSL Labs externo; plantilla solo documenta resultado.",
        },
      ],
    },
    {
      id: "performance_cwv",
      module: "performance_cwv",
      title: "Rendimiento y CWV",
      intro: "Core Web Vitals y presupuestos.",
      items: [
        {
          id: "lcp-budget",
          label: "LCP hero < 2.5s p75 en origen medición acordado",
          status: "fail",
          priority: "P1",
          types: ["rendimiento", "seo_tecnico"],
          evidence: "Terceros bloquean LCP — fail hasta contrato de recorte scripts.",
        },
        {
          id: "inp-budget",
          label: "INP < 200ms en rutas checkout",
          status: "pending",
          priority: "P2",
          types: ["rendimiento", "actualizaciones"],
          evidence: "Field data pendiente — sin CrUX API desde OS.",
        },
      ],
    },
    {
      id: "uptime_monitoring",
      module: "uptime_monitoring",
      title: "Uptime y monitorización",
      intro: "SLOs y alertas.",
      items: [
        {
          id: "slo-availability",
          label: "SLO 99.9% mensual + error budget compartido",
          status: "pass",
          priority: "P1",
          types: ["uptime", "reporting", "rendimiento"],
          evidence: "Expectativas alineadas con `/os/observability`; sin sintéticos desde preview.",
        },
        {
          id: "incident-bridge",
          label: "Bridge on-call + plantilla `/os/observability/incidents`",
          status: "pass",
          priority: "P2",
          types: ["uptime", "soporte"],
          evidence: "Simulacro tabletop externo; OS no abre ticket P1.",
        },
      ],
    },
    {
      id: "monthly_reporting",
      module: "monthly_reporting",
      title: "Reporting mensual",
      intro: "Cambios, incidentes y métricas.",
      items: [
        {
          id: "monthly-pack",
          label: "Pack PDF: cambios, CVE cerrados, CWV, uptime",
          status: "pass",
          priority: "P3",
          types: ["reporting", "seo_tecnico"],
          evidence: "Datos agregados en BI; plantilla no genera PDF.",
        },
        {
          id: "stakeholder-call",
          label: "Call revisión 45m + acta decisiones",
          status: "pending",
          priority: "P3",
          types: ["reporting", "soporte"],
          evidence: "Pendiente agendar — sin sync calendario desde OS.",
        },
      ],
    },
  ],
};
