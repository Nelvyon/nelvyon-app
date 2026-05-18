import type { DisenoProjectConfig } from "@/templates/diseno-grafico-premium/types";
import { DISENO_GRAFICO_PREMIUM_PREVIEW_PATH } from "@/templates/diseno-grafico-premium/paths";

/** Demo OS handoff — illustrative only; no design or asset APIs; DS v2 shell. */
export const disenoGraficoPremiumNelvyonDemoProject: DisenoProjectConfig = {
  pageSeo: {
    title: "NELVYON OS — Diseño gráfico y creatividades Premium delivery template (preview)",
    description:
      "Premium graphic design checklist: brief, sketches, composition, review, adaptations, delivery, reporting. Paperwork only — no Figma/Adobe/stock APIs.",
    canonicalPath: DISENO_GRAFICO_PREMIUM_PREVIEW_PATH,
    siteName: "NELVYON Diseño gráfico Premium",
    keywords: ["diseño gráfico", "creatividad", "branding", "NELVYON", "OS"],
    locale: "es_ES",
  },
  clientLabel: "Demo cuenta · Norte Beverage Co.",
  projectName: "Campaña verano retail · Plantilla de entrega OS",
  projectSubtitle:
    "Estados y evidencias antes de cerrar piezas multicanal. Sin conectores a herramientas de diseño ni DAM desde esta capa.",
  generatedNote:
    "Plantilla v2 (Design System aplicado). Badges banner, flyer, cartel, infografía, presentación, packaging, ads, post social, kit brand describen piezas — no exportan archivos.",
  sections: [
    {
      id: "briefing_concept",
      module: "briefing_concept",
      title: "Briefing y concepto",
      intro: "Objetivo, audiencia, tono y referencias visuales.",
      items: [
        {
          id: "channel-brief",
          label: "Matriz canales (display, retail OOH, social, email hero)",
          status: "pass",
          priority: "P1",
          formats: ["banner_digital", "flyer", "cartel"],
          evidence: "Brief firmado; sin promesa de aprobación legal automática desde OS.",
        },
        {
          id: "brand-align",
          label: "Alineación kit marca vs campaña puntual",
          status: "warn",
          priority: "P2",
          formats: ["kit_brand", "post_social"],
          evidence: "Contraste con `/os/branding-premium/preview` cuando identidad base aplica.",
        },
      ],
    },
    {
      id: "sketches_proposals",
      module: "sketches_proposals",
      title: "Bocetos y propuestas",
      intro: "Direcciones creativas y ronda de selección.",
      items: [
        {
          id: "direction-count",
          label: "Tres direcciones con narrativa distinta (A/B/C) documentadas",
          status: "pass",
          priority: "P1",
          formats: ["infografia", "presentacion", "kit_brand"],
          evidence: "PDF mood externo; plantilla solo registra estado.",
        },
        {
          id: "sketch-signoff",
          label: "Selección cliente con minuta de feedback consolidada",
          status: "pending",
          priority: "P2",
          formats: ["flyer", "cartel"],
          evidence: "Pendiente reunión stakeholder — sin board Figma embebido.",
        },
      ],
    },
    {
      id: "design_composition",
      module: "design_composition",
      title: "Diseño y composición",
      intro: "Retícula, tipografía y jerarquía.",
      items: [
        {
          id: "grid-type",
          label: "Retícula 12 col + escala tipográfica acordada",
          status: "pass",
          priority: "P1",
          formats: ["packaging", "creatividad_ads", "post_social"],
          evidence: "Archivo fuente fuera de NELVYON; OS documenta criterios.",
        },
        {
          id: "contrast-aa",
          label: "Contraste texto/fondo ≥ acuerdo (digital)",
          status: "fail",
          priority: "P1",
          formats: ["banner_digital", "creatividad_ads"],
          evidence: "Cliente pidió texto blanco sobre foto clara — fail hasta corrección.",
        },
      ],
    },
    {
      id: "review_feedback",
      module: "review_feedback",
      title: "Revisión y feedback",
      intro: "Versiones y control de alcance.",
      items: [
        {
          id: "version-names",
          label: "Naming `_v03_clientfeedback` sin forks paralelos",
          status: "pass",
          priority: "P2",
          formats: ["presentacion", "infografia"],
          evidence: "Historial en drive acordado; sin API de versionado.",
        },
        {
          id: "scope-creep",
          label: "Cambio de copy legal fuera de ronda → change order",
          status: "warn",
          priority: "P2",
          formats: ["flyer", "cartel"],
          evidence: "Escalación a `/help` si disputa de claims.",
        },
      ],
    },
    {
      id: "adaptations_formats",
      module: "adaptations_formats",
      title: "Adaptaciones y formatos",
      intro: "Derivados por red y soporte físico.",
      items: [
        {
          id: "social-matrix",
          label: "Matriz 1:1 / 4:5 / 9:16 desde master social",
          status: "pass",
          priority: "P1",
          formats: ["post_social", "banner_digital"],
          evidence: "Referencia `/os/social-media-premium/preview` para calendario honesto.",
        },
        {
          id: "print-bleed",
          label: "Flyer A5 + sangrado 3 mm + perfil Fogra",
          status: "pending",
          priority: "P3",
          formats: ["flyer", "cartel"],
          evidence: "Pendiente prueba imprenta — plantilla no envía a imprenta.",
        },
      ],
    },
    {
      id: "delivery",
      module: "delivery",
      title: "Entrega",
      intro: "Paquete final y checksums.",
      items: [
        {
          id: "handoff-zip",
          label: "ZIP `/master` + `/exports` + PDF prueba",
          status: "pass",
          priority: "P1",
          formats: ["packaging", "kit_brand", "infografia"],
          evidence: "SHA256 en acta; transferencia fuera de NELVYON.",
        },
        {
          id: "source-policy",
          label: "Política de entrega .ai/.fig (solo si contratada)",
          status: "warn",
          priority: "P3",
          formats: ["presentacion", "kit_brand"],
          evidence: "Cliente asumió fuentes libres — re-scope antes de entregar masters.",
        },
      ],
    },
    {
      id: "reporting",
      module: "reporting",
      title: "Reporting",
      intro: "Métricas y aprendizajes.",
      items: [
        {
          id: "ctr-ads",
          label: "CTR creatividades display vs baseline acordado",
          status: "pending",
          priority: "P3",
          formats: ["creatividad_ads", "banner_digital"],
          evidence: "Sin conector ads desde plantilla — ver `/os/ads-premium/preview`.",
        },
        {
          id: "ooh-footfall",
          label: "OOH: footfall claims solo si medición vendida",
          status: "pass",
          priority: "P3",
          formats: ["cartel", "flyer"],
          evidence: "Plantilla limita promesas; datos en proveedor externo.",
        },
      ],
    },
  ],
};
