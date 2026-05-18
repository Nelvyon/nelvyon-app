import type { CanalesProjectConfig } from "@/templates/canales-comunicaciones-premium/types";
import { CANALES_COMUNICACIONES_PREMIUM_PREVIEW_PATH } from "@/templates/canales-comunicaciones-premium/paths";

/** Demo OS handoff — illustrative only; does not extend CANALES Y COMUNICACIONES v1 runtime; DS v2 shell. */
export const canalesPremiumNelvyonDemoProject: CanalesProjectConfig = {
  pageSeo: {
    title: "NELVYON OS — Canales y Comunicaciones Premium delivery template (preview)",
    description:
      "Premium channels checklist: configuration, templates, segmentation, automations, deliverability, reporting. Layers on closed CANALES v1 — no duplicate infra.",
    canonicalPath: CANALES_COMUNICACIONES_PREMIUM_PREVIEW_PATH,
    siteName: "NELVYON Canales Premium",
    keywords: ["channels", "communications", "NELVYON", "OS"],
    locale: "es_ES",
  },
  clientLabel: "Demo sponsor · Lumen Retail Group",
  projectName: "Omnicanal piloto Q2 · Paquete de entrega OS",
  projectSubtitle:
    "Lista de chequeo antes de que marketing/com ops asuma los canales como “production-ready”. Contrastar con CANALES Y COMUNICACIONES NELVYON v1 cerrado.",
  generatedNote:
    "Plantilla v2 (Design System aplicado): no registra API keys ni envía mensajes. Evidencia debe enlazar `/app/communications`, campañas y automatizaciones gobernadas.",
  sections: [
    {
      id: "channel_config",
      module: "channel_config",
      title: "Configuración de canales",
      intro: "Email, SMS, WhatsApp, push e in-app solo donde el workspace los declara.",
      items: [
        {
          id: "channel-matrix",
          label: "Matriz canales habilitados vs piloto (email, SMS, WhatsApp, push, in-app)",
          status: "pass",
          priority: "P1",
          channels: ["email", "sms", "whatsapp", "push", "in_app"],
          evidence:
            "Contrastado con superficie `/app/communications` — desactivar filas no soportadas por producto cerrado.",
        },
        {
          id: "sender-identity",
          label: "Identidad remitente y dominios from/reply-to documentados",
          status: "warn",
          priority: "P1",
          channels: ["email"],
          evidence: "Proveedor externo o política DNS fuera de este preview; OS marca estado hasta DNS verificado.",
        },
      ],
    },
    {
      id: "templates_copy",
      module: "templates_copy",
      title: "Plantillas y copies",
      intro: "Variantes de mensaje, asuntos y cumplimiento legal mínimo.",
      items: [
        {
          id: "template-registry",
          label: "Registro de plantillas (nombre interno, idioma, variables permitidas)",
          status: "pass",
          priority: "P1",
          evidence: "Hoja compartida; sin motor de edición nuevo en template premium.",
        },
        {
          id: "opt-out",
          label: "Copy opt-out / preferencias alineado a jurisdicción declarada",
          status: "pending",
          priority: "P2",
          channels: ["email", "sms"],
          evidence: "Legal/compliance firma pendiente — checklist marca warn hasta cierre.",
        },
      ],
    },
    {
      id: "segmentation",
      module: "segmentation",
      title: "Segmentación",
      intro: "Definición de audiencias y fuentes de datos.",
      items: [
        {
          id: "segment-definitions",
          label: "Segmentos nombrados con reglas legibles (sin PII sensible en esta capa)",
          status: "warn",
          priority: "P1",
          evidence: "Descripción cualitativa; CRM profundo fuera de alcance si no está vendido.",
        },
        {
          id: "sync-cadence",
          label: "Cadencia de refresco de audiencia acordada",
          status: "pass",
          priority: "P3",
          evidence: "Manual / batch externo — plantilla no sincroniza CDPs.",
        },
      ],
    },
    {
      id: "automations",
      module: "automations",
      title: "Automatizaciones",
      intro: "Jobs y webhooks acotados al posture de automatizaciones.",
      items: [
        {
          id: "jobs-posture",
          label: "Automatizaciones referenciadas contra `/automations/jobs` cuando aplica",
          status: "pass",
          priority: "P1",
          evidence: "Flujos descritos en runbook interno; sin nuevos runners desde plantilla.",
        },
        {
          id: "webhooks-boundary",
          label: "Webhooks supervisados — límites en `/automations/webhooks`",
          status: "warn",
          priority: "P2",
          evidence: "Engagement no promete integraciones no gobernadas.",
        },
      ],
    },
    {
      id: "deliverability",
      module: "deliverability",
      title: "Deliverability",
      intro: "Supresión, rebotes y reputación de envío.",
      items: [
        {
          id: "bounce-handling",
          label: "Política rebotes dura/suave y lista de supresión acordada",
          status: "warn",
          priority: "P1",
          channels: ["email"],
          evidence: "Expectativas documentadas — métricas reales en analytics externos.",
        },
        {
          id: "sms-throughput",
          label: "SMS/WhatsApp: throughput y ventanas envío realistas por carrier",
          status: "pending",
          priority: "P2",
          channels: ["sms", "whatsapp"],
          evidence: "Sin SLA mágico — estado pendiente hasta carrier confirme.",
        },
      ],
    },
    {
      id: "reporting",
      module: "reporting",
      title: "Reporting y métricas",
      intro: "KPIs de canal sin inflar benchmarks.",
      items: [
        {
          id: "delivery-kpis",
          label: "KPIs envío (delivery, open, click) definidos por canal habilitado",
          status: "pass",
          priority: "P2",
          evidence: "Fuente de verdad externa o analytics futuro — checklist marca línea base.",
        },
        {
          id: "human-escalation",
          label: "Escalación humana por `/inbox/tickets` si hay incidente de envío masivo",
          status: "pass",
          priority: "P1",
          evidence: "Operadores conocen path cuando canal falla fuera de UI.",
        },
      ],
    },
  ],
};
