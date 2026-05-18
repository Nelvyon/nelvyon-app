import type { FotografiaProjectConfig } from "@/templates/fotografia-producto-premium/types";
import { FOTOGRAFIA_PRODUCTO_PREMIUM_PREVIEW_PATH } from "@/templates/fotografia-producto-premium/paths";

/** Demo OS handoff — illustrative only; no storage or CDN APIs; DS v2 shell. */
export const fotografiaProductoPremiumNelvyonDemoProject: FotografiaProjectConfig = {
  pageSeo: {
    title: "NELVYON OS — Fotografía de Producto Premium delivery template (preview)",
    description:
      "Premium product photography checklist: brief, session, selection, retouch, web optimization, delivery, reporting. Paperwork only — no DAM/CDN APIs.",
    canonicalPath: FOTOGRAFIA_PRODUCTO_PREMIUM_PREVIEW_PATH,
    siteName: "NELVYON Fotografía Producto Premium",
    keywords: ["fotografía", "producto", "e-commerce", "NELVYON", "OS"],
    locale: "es_ES",
  },
  clientLabel: "Demo cuenta · Lumen Skincare Lab",
  projectName: "Pack hero retail Q3 · Plantilla de entrega OS",
  projectSubtitle:
    "Checklist antes de subir stills a canales: sin conectores de almacenamiento ni CDN desde esta capa OS.",
  generatedNote:
    "Plantilla v2 (Design System aplicado). Badges pack_ecommerce, lifestyle, fondo blanco, detalle, editorial, 360°, still life describen entregables — no publican archivos.",
  sections: [
    {
      id: "briefing_moodboard",
      module: "briefing_moodboard",
      title: "Briefing y moodboard",
      intro: "Objetivo de canal, referencias y styling acordado.",
      items: [
        {
          id: "channel-matrix",
          label: "Matriz canal (marketplace, PDP, social crop, press)",
          status: "pass",
          priority: "P1",
          formats: ["pack_ecommerce", "lifestyle", "editorial", "360_product"],
          evidence: "Tabla ratios y safe zones; sin promesa de aprobación automática marketplace.",
        },
        {
          id: "mood-ref",
          label: "Moodboard luz + textura alineado a guía de marca",
          status: "warn",
          priority: "P2",
          formats: ["still_life", "editorial"],
          evidence: "Referencias externas; contraste con `/os/contenido-copywriting-premium/preview` si copy hero aplica.",
        },
      ],
    },
    {
      id: "session_direction",
      module: "session_direction",
      title: "Sesión y dirección",
      intro: "Plan de luz, set y captura.",
      items: [
        {
          id: "white-sweep",
          label: "Barrido fondo blanco catálogo + perfil de color gris",
          status: "pass",
          priority: "P1",
          formats: ["fondo_blanco", "pack_ecommerce"],
          evidence: "Captura en estudio externo; plantilla no dispara tethering.",
        },
        {
          id: "macro-stack",
          label: "Detalle macro textura (aceite, vidrio) con bracketing acordado",
          status: "pending",
          priority: "P2",
          formats: ["detalle", "still_life"],
          evidence: "Pendiente muestra física — sin focus stacking remoto desde OS.",
        },
      ],
    },
    {
      id: "selection_editing",
      module: "selection_editing",
      title: "Selección y edición",
      intro: "Culling, crops y rondas de prueba.",
      items: [
        {
          id: "cull-rules",
          label: "Reglas de culling (hero, alternates, rejects) firmadas",
          status: "pass",
          priority: "P1",
          formats: ["lifestyle", "pack_ecommerce"],
          evidence: "Lightroom/Capture One fuera de NELVYON; solo estado en OS.",
        },
        {
          id: "crop-safe",
          label: "Crops safe para anuncios 1:1 y 4:5 sin recorte de claims legales",
          status: "warn",
          priority: "P2",
          formats: ["editorial", "lifestyle"],
          evidence: "Overlay PSD referenciado; revisión legal fuera de template.",
        },
      ],
    },
    {
      id: "retouch_color",
      module: "retouch_color",
      title: "Retoque y color",
      intro: "Integridad de producto y match a muestra.",
      items: [
        {
          id: "color-match",
          label: "Match color a muestra física (ΔE acordado)",
          status: "pass",
          priority: "P1",
          formats: ["fondo_blanco", "detalle"],
          evidence: "Medición en cabina externa; OS solo documenta target.",
        },
        {
          id: "dust-scope",
          label: "Alcance polvo/reflection cleanup explícito",
          status: "fail",
          priority: "P2",
          formats: ["still_life", "pack_ecommerce"],
          evidence: "Cliente pidió vidrio ‘perfecto’ sin presupuesto — marcado fail hasta re-scope.",
        },
      ],
    },
    {
      id: "web_optimization",
      module: "web_optimization",
      title: "Optimización web",
      intro: "Export sRGB, peso y breakpoints.",
      items: [
        {
          id: "lcp-stills",
          label: "Set WebP/JPEG por breakpoint vs LCP acordado",
          status: "warn",
          priority: "P1",
          formats: ["pack_ecommerce"],
          evidence: "Referencia honesta a `/os/web-premium/preview`; sin CDN push desde OS.",
        },
        {
          id: "srcset-matrix",
          label: "Matriz srcset 320–1920 documentada",
          status: "pending",
          priority: "P3",
          formats: ["lifestyle", "editorial"],
          evidence: "Pendiente handoff front — plantilla no genera responsive images.",
        },
      ],
    },
    {
      id: "delivery_formats",
      module: "delivery_formats",
      title: "Entrega y formatos",
      intro: "Estructura de carpetas, TIFF/JPEG y checksums.",
      items: [
        {
          id: "folder-spec",
          label: "Spec carpetas + naming `_sku_angle_variant`",
          status: "pass",
          priority: "P1",
          formats: ["pack_ecommerce", "360_product"],
          evidence: "ZIP checksum SHA256 en acuerdo; transferencia fuera de NELVYON.",
        },
        {
          id: "turntable-set",
          label: "Set 360° (24–36 frames) listo para viewer externo",
          status: "pass",
          priority: "P2",
          formats: ["360_product", "fondo_blanco"],
          evidence: "Viewer no embebido desde template; sin API de hosting 360.",
        },
      ],
    },
    {
      id: "reporting",
      module: "reporting",
      title: "Reporting",
      intro: "Métricas de canal y lecciones.",
      items: [
        {
          id: "ctr-claims",
          label: "Claims CTR/AOV limitados a ventana de medición acordada",
          status: "pending",
          priority: "P3",
          formats: ["pack_ecommerce", "lifestyle"],
          evidence: "Sin conector analytics desde plantilla premium.",
        },
        {
          id: "motion-handoff",
          label: "Handoff stills a motion si pieza comparte campaña",
          status: "pass",
          priority: "P3",
          formats: ["editorial", "still_life"],
          evidence: "Contraste con `/os/video-multimedia-premium/preview` cuando aplica.",
        },
      ],
    },
  ],
};
