import type { IntegracionProjectConfig } from "@/templates/integraciones-apis-premium/types";
import { INTEGRACIONES_APIS_PREMIUM_PREVIEW_PATH } from "@/templates/integraciones-apis-premium/paths";

/** Demo OS handoff — illustrative only; no live integrations or external API calls; DS v2 shell. */
export const integracionesApisPremiumNelvyonDemoProject: IntegracionProjectConfig = {
  pageSeo: {
    title: "NELVYON OS — Integraciones y APIs Premium delivery template (preview)",
    description:
      "Premium integrations checklist: analysis, auth, implementation, QA, docs, monitoring, handoff. Paperwork only — no vendor APIs or secrets.",
    canonicalPath: INTEGRACIONES_APIS_PREMIUM_PREVIEW_PATH,
    siteName: "NELVYON Integraciones y APIs Premium",
    keywords: ["API", "integración", "OAuth", "NELVYON", "OS"],
    locale: "es_ES",
  },
  clientLabel: "Demo cuenta · Meridian Payments",
  projectName: "Hub órdenes + CRM bidireccional · Plantilla de entrega OS",
  projectSubtitle:
    "Contrato y riesgos antes de cablear sandboxes. Esta vista no invoca REST, webhooks ni pasarelas reales.",
  generatedNote:
    "Plantilla v2 (Design System aplicado). Badges REST, webhook, CRM, payment, ERP, OAuth, SDK, pipeline describen alcance — no abren sockets ni guardan keys.",
  sections: [
    {
      id: "analysis_design",
      module: "analysis_design",
      title: "Análisis y diseño",
      intro: "Contrato, límites y modelo de datos.",
      items: [
        {
          id: "openapi-surface",
          label: "OpenAPI 3.1 + matriz errores 4xx/5xx acordada",
          status: "pass",
          priority: "P1",
          types: ["rest_api", "data_pipeline"],
          evidence: "Spec en repo acordado; plantilla OS no publica Swagger live.",
        },
        {
          id: "rate-limits",
          label: "Cuotas vendor (RPM + burst) documentadas",
          status: "warn",
          priority: "P1",
          types: ["rest_api", "third_party_sdk"],
          evidence: "Vendor no garantiza burst — warn hasta confirmación por escrito.",
        },
      ],
    },
    {
      id: "auth_security",
      module: "auth_security",
      title: "Autenticación y seguridad",
      intro: "OAuth, claves y superficie de ataque.",
      items: [
        {
          id: "oauth-scopes",
          label: "OAuth2 client credentials + scopes mínimos (read:orders)",
          status: "pass",
          priority: "P1",
          types: ["oauth", "webhook"],
          evidence: "Secreto en vault externo; sin paste en checklist OS.",
        },
        {
          id: "webhook-signature",
          label: "Verificación firma HMAC inbound + tolerancia reloj",
          status: "pending",
          priority: "P2",
          types: ["webhook"],
          evidence: "Diseño alineado con `/automations/webhooks`; sin receiver de prueba desde preview.",
        },
      ],
    },
    {
      id: "development_implementation",
      module: "development_implementation",
      title: "Desarrollo e implementación",
      intro: "Fases, entornos y SDKs.",
      items: [
        {
          id: "crm-bidirectional",
          label: "Sync bidireccional cuenta ↔ oportunidad (delta cursor)",
          status: "pass",
          priority: "P1",
          types: ["crm_sync", "erp_sync", "payment_gateway"],
          evidence: "Implementación en servicio dedicado; OS solo lista criterios de idempotencia.",
        },
        {
          id: "sdk-version",
          label: "Pin SDK pasarela v4.2.x (breaking en v5)",
          status: "warn",
          priority: "P2",
          types: ["third_party_sdk", "payment_gateway"],
          evidence: "Plan upgrade Q4 documentado — sin llamada sandbox desde template.",
        },
      ],
    },
    {
      id: "testing_qa",
      module: "testing_qa",
      title: "Pruebas y QA",
      intro: "Contrato, negativos y carga.",
      items: [
        {
          id: "contract-tests",
          label: "Suite Pact + 40 casos negativos (timeouts, 409)",
          status: "pass",
          priority: "P1",
          types: ["rest_api", "third_party_sdk"],
          evidence: "CI externo; plantilla no ejecuta tests.",
        },
        {
          id: "pci-boundary",
          label: "PAN nunca toca middleware NELVYON — solo tokens",
          status: "fail",
          priority: "P1",
          types: ["payment_gateway"],
          evidence: "Cliente pidió log de payload bruto — fail hasta retirar requisito.",
        },
      ],
    },
    {
      id: "technical_documentation",
      module: "technical_documentation",
      title: "Documentación técnica",
      intro: "Runbooks y contratos consumibles.",
      items: [
        {
          id: "postman-pack",
          label: "Colección Postman + variables entorno (sin secrets)",
          status: "pass",
          priority: "P2",
          types: ["rest_api", "oauth"],
          evidence: "Export JSON en paquete ZIP; no hosting desde OS.",
        },
      ],
    },
    {
      id: "monitoring",
      module: "monitoring",
      title: "Monitorización",
      intro: "SLOs, alertas e incidentes.",
      items: [
        {
          id: "slo-webhook",
          label: "SLO procesamiento webhook p95 < 2s + alerta pager",
          status: "pending",
          priority: "P2",
          types: ["webhook", "data_pipeline"],
          evidence: "Expectativas cruzadas con `/os/observability`; sin agente instalado desde preview.",
        },
      ],
    },
    {
      id: "delivery_handoff",
      module: "delivery_handoff",
      title: "Entrega y handoff",
      intro: "Go-live e hipercare.",
      items: [
        {
          id: "cutover-window",
          label: "Ventana cutover + rollback 15 min documentada",
          status: "pass",
          priority: "P1",
          types: ["erp_sync", "crm_sync"],
          evidence: "Cabina guerra externa; OS no dispara cutover.",
        },
        {
          id: "hypercare",
          label: "Hipercare 2 semanas + owner on-call",
          status: "pass",
          priority: "P3",
          types: ["data_pipeline", "payment_gateway"],
          evidence: "RACI anexo; métricas en dashboard BI fuera de NELVYON.",
        },
      ],
    },
  ],
};
