import type { AutomatizacionProjectConfig } from "@/templates/consultoria-automatizacion-premium/types";
import { CONSULTORIA_AUTOMATIZACION_PREMIUM_PREVIEW_PATH } from "@/templates/consultoria-automatizacion-premium/paths";

/** Demo OS handoff — illustrative only; no live automations or external APIs; DS v2 shell. */
export const consultoriaAutomatizacionPremiumNelvyonDemoProject: AutomatizacionProjectConfig = {
  pageSeo: {
    title: "NELVYON OS — Consultoría de automatización Premium delivery template (preview)",
    description:
      "Premium automation consulting checklist: diagnosis, flow map, design, implementation, testing, docs, reporting. Paperwork only — no workflow execution or APIs.",
    canonicalPath: CONSULTORIA_AUTOMATIZACION_PREMIUM_PREVIEW_PATH,
    siteName: "NELVYON Consultoría automatización Premium",
    keywords: ["automatización", "workflow", "webhook", "NELVYON", "OS"],
    locale: "es_ES",
  },
  clientLabel: "Demo cuenta · Atlas Field Services",
  projectName: "Orquestación leads B2B · Plantilla de entrega OS",
  projectSubtitle:
    "Estados y evidencias para cierre de consultoría antes de implementación real. Esta vista no crea jobs ni registra webhooks.",
  generatedNote:
    "Plantilla v2 (Design System aplicado). Badges workflow, webhook, CRM, email_sequence, lead_scoring, reporting_auto, integration_flow describen diseño — no ejecutan integraciones.",
  sections: [
    {
      id: "process_diagnosis",
      module: "process_diagnosis",
      title: "Diagnóstico de procesos",
      intro: "As-is, pain points y datos involucrados.",
      items: [
        {
          id: "stakeholder-map",
          label: "Mapa RACI + fuentes de verdad (CRM vs hoja)",
          status: "pass",
          priority: "P1",
          types: ["workflow", "crm_automation"],
          evidence: "Entrevistas externas; sin lectura de CRM desde plantilla OS.",
        },
        {
          id: "pii-boundary",
          label: "Clasificación PII y retención acordada",
          status: "warn",
          priority: "P1",
          types: ["crm_automation"],
          evidence: "Escalación a `/help` si política dudosa — checklist marca warn.",
        },
      ],
    },
    {
      id: "flow_map",
      module: "flow_map",
      title: "Mapa de flujos",
      intro: "Disparadores, ramas y SLAs.",
      items: [
        {
          id: "trigger-matrix",
          label: "Matriz disparadores (evento, tiempo, manual)",
          status: "pass",
          priority: "P1",
          types: ["webhook", "integration_flow"],
          evidence: "Diagrama Miro/Whimsical externo; contraste honesto con `/automations/webhooks`.",
        },
        {
          id: "idempotency",
          label: "Claves idempotencia por evento duplicado",
          status: "pending",
          priority: "P2",
          types: ["webhook", "workflow"],
          evidence: "Pendiente definición técnica — sin receiver de prueba desde OS.",
        },
      ],
    },
    {
      id: "automation_design",
      module: "automation_design",
      title: "Diseño de automatizaciones",
      intro: "Tipos de automatización y alcance contractual.",
      items: [
        {
          id: "sequence-spec",
          label: "Secuencia email 5 toques + salidas por comportamiento",
          status: "pass",
          priority: "P1",
          types: ["email_sequence", "lead_scoring"],
          evidence: "Alineación con `/os/email-marketing-premium/preview` solo como papeleo.",
        },
        {
          id: "score-model",
          label: "Modelo scoring demográfico + firma acotado",
          status: "warn",
          priority: "P2",
          types: ["lead_scoring"],
          evidence: "Sin motor de scoring en vivo desde template.",
        },
      ],
    },
    {
      id: "implementation",
      module: "implementation",
      title: "Implementación",
      intro: "Fases, entornos y credenciales.",
      items: [
        {
          id: "phase-rollout",
          label: "Rollout por fase (sandbox → piloto → prod)",
          status: "pass",
          priority: "P1",
          types: ["integration_flow", "workflow"],
          evidence: "Credenciales en vault acordado; OS no almacena secrets.",
        },
        {
          id: "job-handoff",
          label: "Handoff a cola jobs interna documentado",
          status: "pending",
          priority: "P2",
          types: ["workflow"],
          evidence: "Referencia `/automations/jobs` para postura producto; sin encolar desde preview.",
        },
      ],
    },
    {
      id: "testing_validation",
      module: "testing_validation",
      title: "Pruebas y validación",
      intro: "UAT y caminos negativos.",
      items: [
        {
          id: "uat-matrix",
          label: "Matriz UAT 12 casos + 4 negativos",
          status: "pass",
          priority: "P1",
          types: ["webhook", "workflow"],
          evidence: "Ejecución en entorno cliente; plantilla solo lista criterios.",
        },
        {
          id: "rollback",
          label: "Plan rollback si webhook satura cola",
          status: "fail",
          priority: "P1",
          types: ["webhook"],
          evidence: "Cliente sin ventana de mantenimiento — fail hasta acuerdo.",
        },
      ],
    },
    {
      id: "documentation",
      module: "documentation",
      title: "Documentación",
      intro: "Runbooks y transferencia.",
      items: [
        {
          id: "runbook-pack",
          label: "Runbook operación + alertas y owners",
          status: "pass",
          priority: "P2",
          types: ["reporting_auto"],
          evidence: "PDF final fuera de NELVYON; template no publica wiki.",
        },
      ],
    },
    {
      id: "reporting_metrics",
      module: "reporting_metrics",
      title: "Reporting y métricas",
      intro: "KPIs y atribución.",
      items: [
        {
          id: "kpi-defs",
          label: "Definiciones MQL/SQL y ventana atribución 30d",
          status: "pending",
          priority: "P3",
          types: ["reporting_auto", "lead_scoring"],
          evidence: "Sin dashboard live embebido; métricas en BI externo.",
        },
        {
          id: "sla-report",
          label: "SLA entrega lead a SDR < 15 min laborable",
          status: "pass",
          priority: "P3",
          types: ["crm_automation", "reporting_auto"],
          evidence: "Medición acordada; plantilla no conecta CRM.",
        },
      ],
    },
  ],
};
