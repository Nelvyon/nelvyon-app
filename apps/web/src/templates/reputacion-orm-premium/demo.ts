import type { OrmProjectConfig } from "@/templates/reputacion-orm-premium/types";
import { REPUTACION_ORM_PREMIUM_PREVIEW_PATH } from "@/templates/reputacion-orm-premium/paths";

/** Demo OS handoff — illustrative only; no monitoring or scraping APIs; DS v2 shell. */
export const reputacionOrmPremiumNelvyonDemoProject: OrmProjectConfig = {
  pageSeo: {
    title: "NELVYON OS — Reputación online y ORM Premium delivery template (preview)",
    description:
      "Premium ORM checklist: audit, reviews, positive content, mitigation, monitoring, crisis, reporting. Paperwork only — no external APIs or scraping.",
    canonicalPath: REPUTACION_ORM_PREMIUM_PREVIEW_PATH,
    siteName: "NELVYON Reputación ORM Premium",
    keywords: ["ORM", "reputación", "reseñas", "NELVYON", "OS"],
    locale: "es_ES",
  },
  clientLabel: "Demo cuenta · Vela Urban Hotels",
  projectName: "ORM multi-local · Plantilla de entrega OS",
  projectSubtitle:
    "Estados y evidencias antes de firmar retainer. Esta capa no consulta APIs de listening ni raspa plataformas.",
  generatedNote:
    "Plantilla v2 (Design System aplicado). Badges auditoría, reseñas, contenido positivo, supresión negativa, monitorización, crisis, reporting describen alcance — no publican respuestas.",
  sections: [
    {
      id: "reputation_audit",
      module: "reputation_audit",
      title: "Auditoría de reputación",
      intro: "Mapa de fuentes y severidad.",
      items: [
        {
          id: "serp-heatmap",
          label: "Heatmap SERP + rich results por marca y variaciones",
          status: "pass",
          priority: "P1",
          types: ["auditoria_reputacion", "monitorizacion_marca"],
          evidence: "Export manual; sin rank tracker API desde OS.",
        },
        {
          id: "maps-dup",
          label: "Duplicados Maps / suplantación — ticket plataforma",
          status: "warn",
          priority: "P1",
          types: ["auditoria_reputacion", "supresion_negativo"],
          evidence: "Proceso legal externo; plantilla marca warn hasta respuesta vendor.",
        },
      ],
    },
    {
      id: "review_management",
      module: "review_management",
      title: "Gestión de reseñas",
      intro: "SLA de respuesta y tono.",
      items: [
        {
          id: "sla-24h",
          label: "SLA respuesta reseña ≤24h laborable por local",
          status: "pass",
          priority: "P1",
          types: ["gestion_resenas", "contenido_positivo"],
          evidence: "Playbook tono en Notion; sin conector GMB desde template.",
        },
        {
          id: "fake-review",
          label: "Protocolo denuncia reseña fraudulenta",
          status: "pending",
          priority: "P2",
          types: ["gestion_resenas", "supresion_negativo"],
          evidence: "Pendiente plantilla plataforma — sin scraping de hilos.",
        },
      ],
    },
    {
      id: "positive_content",
      module: "positive_content",
      title: "Contenido positivo",
      intro: "Narrativa owned y PR light.",
      items: [
        {
          id: "story-arc",
          label: "Arco historia staff + impacto local (6 piezas/mes)",
          status: "pass",
          priority: "P2",
          types: ["contenido_positivo", "reporting"],
          evidence: "Alineación con `/os/contenido-copywriting-premium/preview` solo como papeleo.",
        },
      ],
    },
    {
      id: "negative_suppression",
      module: "negative_suppression",
      title: "Supresión de negativos",
      intro: "Vías legales y de plataforma únicamente.",
      items: [
        {
          id: "defamation-triage",
          label: "Triage difamación vs opinión — legal primero",
          status: "fail",
          priority: "P1",
          types: ["supresion_negativo", "crisis_management"],
          evidence: "Cliente pidió “borrar artículo” sin orden judicial — fail hasta abogado.",
        },
      ],
    },
    {
      id: "continuous_monitoring",
      module: "continuous_monitoring",
      title: "Monitorización continua",
      intro: "Keywords y alertas.",
      items: [
        {
          id: "keyword-pack",
          label: "Pack 120 keywords + 20 competidor (solo menciones marca)",
          status: "warn",
          priority: "P2",
          types: ["monitorizacion_marca", "reporting"],
          evidence: "Herramienta externa; OS no abre stream API.",
        },
        {
          id: "alert-fatigue",
          label: "Reglas anti-fatiga: umbral sentimiento + dedupe",
          status: "pass",
          priority: "P2",
          types: ["monitorizacion_marca", "auditoria_reputacion"],
          evidence: "Config documentada; sin pager desde preview.",
        },
      ],
    },
    {
      id: "crisis_management",
      module: "crisis_management",
      title: "Gestión de crisis",
      intro: "RACI y holding lines.",
      items: [
        {
          id: "war-room",
          label: "War room checklist + aprobación legal holding",
          status: "pass",
          priority: "P1",
          types: ["crisis_management", "contenido_positivo"],
          evidence: "Simulacro QBR externo; OS no dispara comunicados.",
        },
      ],
    },
    {
      id: "monthly_reporting",
      module: "monthly_reporting",
      title: "Reporting mensual",
      intro: "Métricas y limitaciones.",
      items: [
        {
          id: "share-voice",
          label: "Share of voice vs competencia (definición acotada)",
          status: "pending",
          priority: "P3",
          types: ["reporting", "monitorizacion_marca"],
          evidence: "Dataset vendor; contraste honesto con `/os/seo-premium/preview` si SERP aplica.",
        },
        {
          id: "review-velocity",
          label: "Velocidad reseñas netas por local",
          status: "pass",
          priority: "P3",
          types: ["reporting", "gestion_resenas"],
          evidence: "Agregación manual acordada — sin scrape mensual desde OS.",
        },
      ],
    },
  ],
};
