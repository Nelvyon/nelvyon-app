import type { InmersivoProjectConfig } from "@/templates/3d-inmersivo-premium/types";
import { INMERSIVO_3D_PREMIUM_PREVIEW_PATH } from "@/templates/3d-inmersivo-premium/paths";

/** Demo OS handoff — illustrative only; no 3D engine or render APIs; DS v2 shell. */
export const inmersivo3dPremiumNelvyonDemoProject: InmersivoProjectConfig = {
  pageSeo: {
    title: "NELVYON OS — 3D y Contenido Inmersivo Premium delivery template (preview)",
    description:
      "Premium 3D/immersive checklist: brief, modeling, materials, animation, optimization, delivery, reporting. Paperwork only — no render APIs.",
    canonicalPath: INMERSIVO_3D_PREMIUM_PREVIEW_PATH,
    siteName: "NELVYON 3D Inmersivo Premium",
    keywords: ["3D", "immersive", "AR", "VR", "NELVYON", "OS"],
    locale: "es_ES",
  },
  clientLabel: "Demo cuenta · Forge Consumer Electronics",
  projectName: "Visualizador producto hero · Paquete de entrega OS",
  projectSubtitle:
    "Lista de chequeo antes de que retail apruebe assets 3D e inmersivos. Sin motores ni farm de render conectados desde esta capa.",
  generatedNote:
    "Plantilla v2 (Design System aplicado). Badges model_3d, animation_3d, AR, VR, product visualizer, interactive scene, motion_3d describen piezas — no publican builds.",
  sections: [
    {
      id: "briefing_concept",
      module: "briefing_concept",
      title: "Briefing y concepto",
      intro: "Objetivo, plataforma destino y mapa de interacción.",
      items: [
        {
          id: "platform-matrix",
          label: "Matriz plataforma (web embed, app nativa, Quest clase X)",
          status: "pass",
          priority: "P1",
          formats: ["ar_experience", "vr_experience", "product_visualizer"],
          evidence: "Expectativas documentadas; sin garantía de certificación store desde OS.",
        },
        {
          id: "concept-art",
          label: "Bloque concept art + referencias de iluminación",
          status: "warn",
          priority: "P2",
          formats: ["interactive_scene", "model_3d"],
          evidence: "Moodboards externos; alineación con `/os/contenido-copywriting-premium/preview` si copy UX embebido.",
        },
      ],
    },
    {
      id: "modeling_3d",
      module: "modeling_3d",
      title: "Modelado 3D",
      intro: "Topología, escala y piezas modulares.",
      items: [
        {
          id: "hero-mesh",
          label: "Malla hero <150k tris (acuerdo) con LOD1/LOD2",
          status: "pass",
          priority: "P1",
          formats: ["model_3d", "product_visualizer"],
          evidence: "Captura viewport DCC externo; plantilla no abre archivos.",
        },
        {
          id: "cad-import",
          label: "Import CAD referenciado solo si pipeline vendido",
          status: "pending",
          priority: "P2",
          formats: ["model_3d"],
          evidence: "Sin conversión automática prometida — checklist marca pendiente.",
        },
      ],
    },
    {
      id: "texturing_materials",
      module: "texturing_materials",
      title: "Texturizado y materiales",
      intro: "PBR, canales y naming de texturas.",
      items: [
        {
          id: "pbr-pack",
          label: "Pack PBR 2K + compresión BC7 / ASTC declarada",
          status: "warn",
          priority: "P1",
          formats: ["model_3d", "ar_experience"],
          evidence: "Tabla de resoluciones por LOD; revisión en dispositivo físico fuera de NELVYON.",
        },
        {
          id: "brand-materials",
          label: "Materiales marca (metal roughness) aprobados",
          status: "pass",
          priority: "P2",
          formats: ["product_visualizer", "motion_3d"],
          evidence: "Referencia `/app/branding` cuando política de color aplica.",
        },
      ],
    },
    {
      id: "animation",
      module: "animation",
      title: "Animación",
      intro: "Rig, clips y loops exportables.",
      items: [
        {
          id: "turntable",
          label: "Clip turntable 360° + loop seamless",
          status: "pass",
          priority: "P1",
          formats: ["animation_3d", "motion_3d"],
          evidence: "Timeline DCC externo; sin bake remoto desde OS.",
        },
        {
          id: "interactive-rig",
          label: "Rig simplificado para escena interactiva (constraints)",
          status: "warn",
          priority: "P2",
          formats: ["interactive_scene", "animation_3d"],
          evidence: "Documento técnico de huesos máximos por plataforma.",
        },
      ],
    },
    {
      id: "optimization_performance",
      module: "optimization_performance",
      title: "Optimización y rendimiento",
      intro: "Draw calls, sombras y memoria de textura.",
      items: [
        {
          id: "draw-budget",
          label: "Budget draw calls móvil vs desktop declarado",
          status: "pass",
          priority: "P1",
          formats: ["ar_experience", "interactive_scene"],
          evidence: "Profiler externo; plantilla solo refleja acuerdo contractual.",
        },
        {
          id: "vr-framerate",
          label: "Target 72/90 Hz VR con lista de degradaciones",
          status: "pending",
          priority: "P1",
          formats: ["vr_experience"],
          evidence: "Pendiente prueba en headset objetivo — sin lab remoto desde template.",
        },
      ],
    },
    {
      id: "delivery_formats",
      module: "delivery_formats",
      title: "Entrega y formatos",
      intro: "glTF, USDZ, binarios y checksums.",
      items: [
        {
          id: "gltf-bundle",
          label: "glTF 2.0 + bin + texturas empaquetadas con checksum SHA256",
          status: "pass",
          priority: "P1",
          formats: ["model_3d", "product_visualizer", "interactive_scene"],
          evidence: "Transferencia acordada; sin CDN upload desde OS.",
        },
        {
          id: "usdz-ios",
          label: "USDZ iOS Quick Look cuando AR móvil está en scope",
          status: "warn",
          priority: "P2",
          formats: ["ar_experience"],
          evidence: "Validación en dispositivo Apple externo.",
        },
      ],
    },
    {
      id: "reporting",
      module: "reporting",
      title: "Reporting",
      intro: "Métricas de uso y lecciones de campo.",
      items: [
        {
          id: "embed-analytics",
          label: "Plan analytics embed (si web) referenciado contra `/os/web-premium/preview`",
          status: "pending",
          priority: "P3",
          formats: ["product_visualizer", "interactive_scene"],
          evidence: "Sin conector GA4 desde plantilla premium.",
        },
        {
          id: "motion-handoff",
          label: "Handoff motion 3D a video si pieza comparte pipeline",
          status: "pass",
          priority: "P3",
          formats: ["motion_3d"],
          evidence: "Contraste honesto con `/os/video-multimedia-premium/preview` cuando aplica.",
        },
      ],
    },
  ],
};
