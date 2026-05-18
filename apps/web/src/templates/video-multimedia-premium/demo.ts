import type { VideoProjectConfig } from "@/templates/video-multimedia-premium/types";
import { VIDEO_MULTIMEDIA_PREMIUM_PREVIEW_PATH } from "@/templates/video-multimedia-premium/paths";

/** Demo OS handoff — illustrative only; no video/render APIs; DS v2 shell. */
export const videoMultimediaPremiumNelvyonDemoProject: VideoProjectConfig = {
  pageSeo: {
    title: "NELVYON OS — Video y Multimedia Premium delivery template (preview)",
    description:
      "Premium video checklist: brief, production, edit, mograph, subtitles, delivery, reporting. Paperwork only — no transcode or CDN APIs.",
    canonicalPath: VIDEO_MULTIMEDIA_PREMIUM_PREVIEW_PATH,
    siteName: "NELVYON Video Multimedia Premium",
    keywords: ["video", "multimedia", "NELVYON", "OS"],
    locale: "es_ES",
  },
  clientLabel: "Demo producción · Helix MedTech",
  projectName: "Kit lanzamiento producto · Paquete de entrega OS",
  projectSubtitle:
    "Lista de chequeo antes de que cliente reciba masters y derivados. Sin render en la nube ni subidas automáticas desde esta capa.",
  generatedNote:
    "Plantilla v2 (Design System aplicado). Badges corporativo, social clip, reel, explainer, testimonial, ad video, podcast, motion graphics describen piezas — no disparan pipelines.",
  sections: [
    {
      id: "briefing_script",
      module: "briefing_script",
      title: "Briefing y guión",
      intro: "Objetivo, audiencia, CTA y script aprobado.",
      items: [
        {
          id: "creative-brief",
          label: "Brief creativo + referencias visuales (moodboard)",
          status: "pass",
          priority: "P1",
          formats: ["corporate", "explainer"],
          evidence: "PDF externo; alineación con `/os/contenido-copywriting-premium/preview` si guión compartido.",
        },
        {
          id: "script-lock",
          label: "Guión congelado v1.2 antes de rodaje / animatic",
          status: "warn",
          priority: "P1",
          formats: ["testimonial", "ad_video", "corporate"],
          evidence: "Cambios mayores post-freeze marcan coste extra — checklist marca warn hasta firma cliente.",
        },
      ],
    },
    {
      id: "production",
      module: "production",
      title: "Producción",
      intro: "Rodaje, locución o captura de pantalla según formato.",
      items: [
        {
          id: "shoot-day",
          label: "Plan de rodaje / grabación con lista de tomas",
          status: "pass",
          priority: "P1",
          formats: ["corporate", "testimonial", "reel"],
          evidence: "Call sheet externo; sin booking APIs desde NELVYON OS.",
        },
        {
          id: "podcast-capture",
          label: "Captura audio/video podcast multicámara",
          status: "pending",
          priority: "P2",
          formats: ["podcast"],
          evidence: "Sincronización plural externa; plantilla solo marca estado.",
        },
      ],
    },
    {
      id: "editing_post",
      module: "editing_post",
      title: "Edición y postproducción",
      intro: "Montaje, color, mezcla y masters.",
      items: [
        {
          id: "edit-rounds",
          label: "Dos rondas de feedback incluidas + tabla de cambios",
          status: "pass",
          priority: "P1",
          formats: ["social_clip", "ad_video", "explainer"],
          evidence: "Rondas adicionales documentadas como change order.",
        },
        {
          id: "loudness",
          label: "Normalización loudness (-16 LUFS aprox. redes) declarada",
          status: "warn",
          priority: "P2",
          formats: ["reel", "social_clip", "ad_video"],
          evidence: "Medición en DAW externo — no certificación broadcast desde template.",
        },
      ],
    },
    {
      id: "mograph",
      module: "mograph",
      title: "Motion graphics",
      intro: "Animación 2D, lower-thirds y bumpers de marca.",
      items: [
        {
          id: "lower-thirds",
          label: "Pack lower-thirds + safe area 9:16 y 16:9",
          status: "pass",
          priority: "P1",
          formats: ["motion_graphics", "corporate"],
          evidence: "Proyecto AE/Resolve fuera del producto; naming `BRAND_LT_v2`.",
        },
        {
          id: "explainer-boards",
          label: "Storyboard explainer animado vs live-action mixto",
          status: "warn",
          priority: "P2",
          formats: ["explainer", "motion_graphics"],
          evidence: "Cliente confirma proporción animación vs stock.",
        },
      ],
    },
    {
      id: "subtitles_accessibility",
      module: "subtitles_accessibility",
      title: "Subtítulos y accesibilidad",
      intro: "SRT/VTT, idiomas y WCAG-oriented notes.",
      items: [
        {
          id: "caption-files",
          label: "SRT/VTT ES + EN entregados con timecode maestro",
          status: "pass",
          priority: "P1",
          formats: ["corporate", "podcast", "explainer"],
          evidence: "Revisión humana; `/help` si hay claims legales en copy incrustado.",
        },
        {
          id: "burn-in-policy",
          label: "Política burn-in vs sidecar por plataforma destino",
          status: "pending",
          priority: "P3",
          formats: ["social_clip", "reel"],
          evidence: "Pendiente hasta que marketing confirme redes destino.",
        },
      ],
    },
    {
      id: "delivery_formats",
      module: "delivery_formats",
      title: "Entrega y formatos",
      intro: "Mezzanine, proxies y derivados sociales.",
      items: [
        {
          id: "master-spec",
          label: "Master ProRes / H.264 HQ + checksum verificado",
          status: "pass",
          priority: "P1",
          formats: ["corporate", "ad_video", "testimonial"],
          evidence: "Transferencia por disco acordado — sin CDN upload desde OS.",
        },
        {
          id: "social-derivatives",
          label: "Derivados 1:1, 4:5, 9:16 con safe titles",
          status: "warn",
          priority: "P1",
          formats: ["social_clip", "reel"],
          evidence: "Contraste con `/os/social-media-premium/preview` si mismo retainer publica.",
        },
      ],
    },
    {
      id: "reporting",
      module: "reporting",
      title: "Reporting",
      intro: "Métricas de performance y lecciones aprendidas.",
      items: [
        {
          id: "kpi-sheet",
          label: "Hoja KPI (views, retention proxy, CTR out) según plataforma",
          status: "pending",
          priority: "P2",
          formats: ["ad_video", "social_clip", "reel"],
          evidence: "Datos ingresados manualmente desde dashboards nativos.",
        },
        {
          id: "campaign-alignment",
          label: "Si el video apoya campaña, referencia honesta a `/campaigns`",
          status: "pass",
          priority: "P3",
          formats: ["ad_video"],
          evidence: "Solo si contrato lo menciona.",
        },
      ],
    },
  ],
};
