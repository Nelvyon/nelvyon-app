import type { EmailMarketingProjectConfig } from "@/templates/email-marketing-premium/types";
import { EMAIL_MARKETING_PREMIUM_PREVIEW_PATH } from "@/templates/email-marketing-premium/paths";

/** Demo OS handoff — illustrative only; no ESP or send API integration; DS v2 shell. */
export const emailMarketingPremiumNelvyonDemoProject: EmailMarketingProjectConfig = {
  pageSeo: {
    title: "NELVYON OS — Email Marketing Premium delivery template (preview)",
    description:
      "Premium email checklist: strategy, templates, copy, automations, deliverability, metrics. Paperwork only — no ESP APIs.",
    canonicalPath: EMAIL_MARKETING_PREMIUM_PREVIEW_PATH,
    siteName: "NELVYON Email Marketing Premium",
    keywords: ["email", "marketing", "NELVYON", "OS"],
    locale: "es_ES",
  },
  clientLabel: "Demo cuenta · Atlas B2B SaaS",
  projectName: "Lifecycle email H2 · Paquete de entrega OS",
  projectSubtitle:
    "Lista de chequeo antes de que revenue/marketing firme el programa de email. Sin conectores ESP ni envíos desde esta capa.",
  generatedNote:
    "Plantilla v2 (Design System aplicado). Badges de tipo (newsletter, campaña, automatización, transaccional, nurturing) describen alcance — no disparan journeys.",
  sections: [
    {
      id: "strategy_segmentation",
      module: "strategy_segmentation",
      title: "Estrategia y segmentación",
      intro: "Mix de programas y audiencias alineadas al plan vendido.",
      items: [
        {
          id: "program-mix",
          label: "Mix newsletter + campañas puntuales + nurturing declarado",
          status: "pass",
          priority: "P1",
          emailKinds: ["newsletter", "campaign", "nurturing"],
          evidence: "Tabla externa; cada fila referencia fuente de audiencia (opt-in declarado).",
        },
        {
          id: "segment-rules",
          label: "Reglas de segmentación legibles (sin PII sensible en preview OS)",
          status: "warn",
          priority: "P1",
          emailKinds: ["campaign", "nurturing"],
          evidence: "Revisión legal pendiente para datos sensibles — checklist marca warn.",
        },
      ],
    },
    {
      id: "design_templates",
      module: "design_templates",
      title: "Diseño y plantillas",
      intro: "Módulos HTML, versión texto y prueba en clientes.",
      items: [
        {
          id: "master-template",
          label: "Plantilla maestra responsive + bloques reutilizables",
          status: "pass",
          priority: "P1",
          emailKinds: ["newsletter", "campaign"],
          evidence: "Repositorio externo; `/app/branding` consultado si política visual aplica.",
        },
        {
          id: "transactional-parity",
          label: "Paridad visual transaccional vs marketing (expectativas)",
          status: "pending",
          priority: "P2",
          emailKinds: ["transactional"],
          evidence: "Alineación con copy en `/app/communications` cuando el producto expone mensajes transaccionales.",
        },
      ],
    },
    {
      id: "copy_subjects",
      module: "copy_subjects",
      title: "Copies y asuntos",
      intro: "Matriz asunto + preheader + CTA por envío.",
      items: [
        {
          id: "subject-matrix",
          label: "Matriz de asuntos A/B y preheaders (límite caracteres por cliente ESP)",
          status: "warn",
          priority: "P1",
          emailKinds: ["newsletter", "campaign"],
          evidence: "Hoja compartida; sin envío de prueba desde NELVYON OS.",
        },
        {
          id: "nurture-voice",
          label: "Tono nurturing coherente con marca (serie ≥3 correos)",
          status: "pass",
          priority: "P2",
          emailKinds: ["nurturing"],
          evidence: "Guion externo; plantilla solo marca progresión de estados.",
        },
      ],
    },
    {
      id: "automations_flows",
      module: "automations_flows",
      title: "Automatizaciones y flujos",
      intro: "Disparadores, esperas y salidas — sin runners nuevos.",
      items: [
        {
          id: "drip-triggers",
          label: "Flujos automatización con triggers documentados (evento o tiempo)",
          status: "pass",
          priority: "P1",
          emailKinds: ["automation", "nurturing"],
          evidence: "Si toca producto, referencia honesta a `/automations/jobs` sin prometer colas nuevas.",
        },
        {
          id: "webhook-edge",
          label: "Bordes webhook (si aplica) acotados a `/automations/webhooks`",
          status: "warn",
          priority: "P2",
          emailKinds: ["automation", "transactional"],
          evidence: "Solo hooks gobernados; sin integraciones fantasmas.",
        },
      ],
    },
    {
      id: "deliverability_reputation",
      module: "deliverability_reputation",
      title: "Deliverability y reputación",
      intro: "DNS, listas de supresión y warm-up.",
      items: [
        {
          id: "dns-auth",
          label: "SPF / DKIM / DMARC — estado documentado por dominio remitente",
          status: "warn",
          priority: "P1",
          emailKinds: ["newsletter", "campaign", "transactional"],
          evidence: "Capturas externas; plantilla no valida DNS.",
        },
        {
          id: "bounce-suppression",
          label: "Política rebotes y supresión global vs por lista",
          status: "pass",
          priority: "P1",
          emailKinds: ["campaign", "automation"],
          evidence: "Operaciones documenta herramienta ESP fuera de NELVYON.",
        },
      ],
    },
    {
      id: "metrics_reporting",
      module: "metrics_reporting",
      title: "Métricas y reporting",
      intro: "KPIs de envío y narrativa ejecutiva.",
      items: [
        {
          id: "kpi-definitions",
          label: "Definiciones open/click/unsub/bounce acordadas",
          status: "pass",
          priority: "P2",
          emailKinds: ["newsletter", "campaign", "nurturing"],
          evidence: "Exports manuales desde ESP — sin conector.",
        },
        {
          id: "campaign-bridge",
          label: "Si el programa enlaza campañas workspace, referencia a `/campaigns`",
          status: "pending",
          priority: "P3",
          emailKinds: ["campaign"],
          evidence: "Solo si contrato lo menciona; si no, N/A explícito.",
        },
      ],
    },
  ],
};
