/**
 * OS delivery QA aligned with backend/ops/runbooks/diseno_grafico_creatividades_premium_nelvyon_v1.md
 * v2: NELVYON Design System primitives applied — see `/os/design-system`.
 */

export type DisenoPremiumDeliveryStatus = "ok" | "warn" | "crit" | "pending";

export interface DisenoPremiumDeliveryItem {
  id: string;
  source: "runbook" | "template";
  area: string;
  description: string;
  status: DisenoPremiumDeliveryStatus;
}

export const DISENO_PREMIUM_DELIVERY_ITEMS: readonly DisenoPremiumDeliveryItem[] = [
  {
    id: "rb-ready",
    source: "runbook",
    area: "READY",
    status: "ok",
    description: "Golden path / `pnpm gate` when design-related web surfaces ship in the same release train.",
  },
  {
    id: "rb-brief",
    source: "runbook",
    area: "BRIEF & CONCEPT",
    status: "ok",
    description: "Goals, audience, references — cross-check `/app/branding` and `/os/branding-premium/preview` when kit_brand extends identity.",
  },
  {
    id: "rb-sketch",
    source: "runbook",
    area: "SKETCHES & PROPOSALS",
    status: "ok",
    description:
      "Direction count and pick workflow — formats: banner_digital, flyer, cartel, infografia, presentacion, packaging, creatividad_ads, post_social, kit_brand.",
  },
  {
    id: "rb-design",
    source: "runbook",
    area: "DESIGN & COMPOSITION",
    status: "ok",
    description: "Grid, type scale, contrast — no Figma/Adobe API hooks from OS.",
  },
  {
    id: "rb-review",
    source: "runbook",
    area: "REVIEW & FEEDBACK",
    status: "warn",
    description: "Consolidated feedback, version naming, change-order rules explicit.",
  },
  {
    id: "rb-adapt",
    source: "runbook",
    area: "ADAPTATIONS & FORMATS",
    status: "ok",
    description: "Master → derivatives per channel — `/os/social-media-premium/preview` when post_social matrix applies.",
  },
  {
    id: "rb-delivery",
    source: "runbook",
    area: "DELIVERY",
    status: "warn",
    description: "Handoff ZIP/PDF naming, bleed, color profile — no asset CDN upload from this template.",
  },
  {
    id: "rb-reporting",
    source: "runbook",
    area: "REPORTING",
    status: "ok",
    description: "Creative performance claims limited — `/os/ads-premium/preview` when creatividad_ads ties to media plan.",
  },
  {
    id: "tmpl-ds-v2",
    source: "template",
    area: "Design System v2",
    status: "ok",
    description:
      "Diseño gráfico y creatividades Premium preview uses `@/design-system` semantic tokens and NelvyonDs components; compare with `/os/design-system`.",
  },
  {
    id: "tmpl-sections",
    source: "template",
    area: "Deliverable modules",
    status: "ok",
    description:
      "Brief/concept, sketches/proposals, design/composition, review/feedback, adaptations/formats, delivery, reporting — P1–P3 + format badges where set.",
  },
  {
    id: "tmpl-meta",
    source: "template",
    area: "Metadata helper",
    status: "ok",
    description: "`buildDisenoPremiumMetadata` for preview OG/Twitter defaults.",
  },
  {
    id: "tmpl-no-apis",
    source: "template",
    area: "No design/asset APIs",
    status: "ok",
    description: "No Figma, Canva, Adobe Cloud, or stock API integrations from this OS template.",
  },
  {
    id: "tmpl-cross-copy",
    source: "template",
    area: "Copy alignment",
    status: "ok",
    description: "When copy ships with layouts, spot-check `/os/contenido-copywriting-premium/preview`.",
  },
  {
    id: "tmpl-cross-web",
    source: "template",
    area: "Web shells",
    status: "ok",
    description: "When banners land in product UI, align specs with `/os/web-premium/preview`.",
  },
  {
    id: "tmpl-boundary",
    source: "template",
    area: "Closed fronts",
    status: "ok",
    description: "Does not modify closed product fronts or `/crm/deals`.",
  },
  {
    id: "tmpl-responsive",
    source: "template",
    area: "Responsive QA",
    status: "warn",
    description: "`/os/diseno-grafico-premium/preview` at mobile / tablet / desktop, clean console.",
  },
] as const;
