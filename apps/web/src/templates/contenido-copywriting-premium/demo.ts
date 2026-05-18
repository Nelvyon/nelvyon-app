import type { ContenidoProjectConfig } from "@/templates/contenido-copywriting-premium/types";
import { CONTENIDO_COPYWRITING_PREMIUM_PREVIEW_PATH } from "@/templates/contenido-copywriting-premium/paths";

/** Demo OS handoff — illustrative only; no generative content APIs; DS v2 shell. */
export const contenidoCopywritingPremiumNelvyonDemoProject: ContenidoProjectConfig = {
  pageSeo: {
    title: "NELVYON OS — Contenido y Copywriting Premium delivery template (preview)",
    description:
      "Premium content checklist: strategy, voice, calendar, copy, review, SEO on-page, deliverables. Paperwork only — no LLM APIs.",
    canonicalPath: CONTENIDO_COPYWRITING_PREMIUM_PREVIEW_PATH,
    siteName: "NELVYON Contenido Premium",
    keywords: ["copywriting", "content", "NELVYON", "OS"],
    locale: "es_ES",
  },
  clientLabel: "Demo retainer · Vertex Health Education",
  projectName: "Hub editorial H1 · Paquete de entrega OS",
  projectSubtitle:
    "Lista de chequeo antes de que marketing apruebe el paquete de contenidos. Sin generadores ni CMS conectados desde esta capa.",
  generatedNote:
    "Plantilla v2 (Design System aplicado). Badges de formato (blog, landing, web copy, email copy, ads copy, guión, redes sociales, SEO content) describen alcance — no publican ni redactan solos.",
  sections: [
    {
      id: "strategy_voice",
      module: "strategy_voice",
      title: "Estrategia y tono de voz",
      intro: "Pilares, audiencias y matriz de voz aprobada.",
      items: [
        {
          id: "voice-matrix",
          label: "Matriz de tono (formal / cercano / técnico) por canal y formato",
          status: "pass",
          priority: "P1",
          formats: ["blog", "social_media", "email_copy"],
          evidence: "Alineado con guías externas; `/app/branding` si política visual/voz está en contrato.",
        },
        {
          id: "banned-phrases",
          label: "Lista frases vetadas y claims regulados (salud/finanzas)",
          status: "warn",
          priority: "P1",
          formats: ["landing", "ads_copy", "seo_content"],
          evidence: "Legal pendiente firma — checklist marca warn hasta cierre.",
        },
      ],
    },
    {
      id: "editorial_calendar",
      module: "editorial_calendar",
      title: "Calendario editorial",
      intro: "Slots, responsables y tipo de pieza por fecha.",
      items: [
        {
          id: "cadence",
          label: "Cadencia 12 semanas con formato explícito por slot",
          status: "pass",
          priority: "P1",
          formats: ["blog", "social_media", "email_copy", "seo_content"],
          evidence: "Hoja compartida; sin publicación automática desde NELVYON OS.",
        },
        {
          id: "campaign-sync",
          label: "Alineación con campañas workspace cuando copy respalda lanzamiento",
          status: "pending",
          priority: "P2",
          formats: ["landing", "ads_copy", "email_copy"],
          evidence: "Referencia honesta a `/campaigns` solo si engagement lo vendió.",
        },
      ],
    },
    {
      id: "writing_copy",
      module: "writing_copy",
      title: "Redacción y copy",
      intro: "Borradores, variantes y CTAs por pieza.",
      items: [
        {
          id: "long-form-blog",
          label: "Serie blog pillar + cluster enlazado",
          status: "pass",
          priority: "P1",
          formats: ["blog", "seo_content"],
          evidence: "Docs externos; enlaces internos descritos en anexo, no crawleados aquí.",
        },
        {
          id: "video-script",
          label: "Guión corto para asset de video / webinar",
          status: "warn",
          priority: "P2",
          formats: ["script", "web_copy"],
          evidence: "Duración y beats acordados — producción fuera de alcance si no está vendido.",
        },
        {
          id: "social-snacks",
          label: "Snippets redes para calendario social vinculado",
          status: "pass",
          priority: "P2",
          formats: ["social_media"],
          evidence: "Contraste con `/os/social-media-premium/preview` si el mismo retainer cubre social.",
        },
      ],
    },
    {
      id: "review_quality",
      module: "review_quality",
      title: "Revisión y calidad",
      intro: "Rondas de revisión, estilo y consistencia terminológica.",
      items: [
        {
          id: "style-sheet",
          label: "Style sheet (mayúsculas, números, métricas, nombres producto)",
          status: "pass",
          priority: "P2",
          formats: ["web_copy", "email_copy", "landing"],
          evidence: "Documento maestro fuera del producto.",
        },
        {
          id: "peer-review",
          label: "Ronda peer review + editor asignado antes de final",
          status: "pending",
          priority: "P3",
          formats: ["blog", "script", "ads_copy"],
          evidence: "Roles nombrados; sin workflow tool nuevo en template.",
        },
      ],
    },
    {
      id: "seo_onpage",
      module: "seo_onpage",
      title: "SEO on-page",
      intro: "Títulos, meta, encabezados y enlaces internos descritos.",
      items: [
        {
          id: "keyword-map",
          label: "Mapa keyword → URL con intención declarada",
          status: "warn",
          priority: "P1",
          formats: ["seo_content", "landing", "blog"],
          evidence: "Contraste narrativo con `/os/seo-premium/preview` — sin rank promises.",
        },
        {
          id: "snippet-tests",
          label: "Propuestas title/meta revisadas para longitud y duplicados",
          status: "pass",
          priority: "P2",
          formats: ["seo_content"],
          evidence: "QA manual; SERP simulación externa.",
        },
      ],
    },
    {
      id: "deliverables_reporting",
      module: "deliverables_reporting",
      title: "Entregables y reporting",
      intro: "Pack final y narrativa de desempeño cualitativo.",
      items: [
        {
          id: "handoff-pack",
          label: "ZIP/handoff con versiones finales por formato",
          status: "pass",
          priority: "P1",
          formats: ["blog", "landing", "email_copy", "ads_copy", "web_copy"],
          evidence: "Naming `FINAL_v3` convención acordada — almacenamiento fuera de OS.",
        },
        {
          id: "readership-proxy",
          label: "Métricas proxy (tiempo en página, scroll) solo si analytics vendido",
          status: "pending",
          priority: "P3",
          formats: ["web_copy", "landing"],
          evidence: "Sin conector analytics desde plantilla premium.",
        },
      ],
    },
  ],
};
