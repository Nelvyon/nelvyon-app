/**
 * OS delivery QA aligned with backend/ops/runbooks/3d_contenido_inmersivo_premium_nelvyon_v1.md
 * v2: NELVYON Design System primitives applied — see `/os/design-system`.
 */

export type InmersivoPremiumDeliveryStatus = "ok" | "warn" | "crit" | "pending";

export interface InmersivoPremiumDeliveryItem {
  id: string;
  source: "runbook" | "template";
  area: string;
  description: string;
  status: InmersivoPremiumDeliveryStatus;
}

export const INMERSIVO_PREMIUM_DELIVERY_ITEMS: readonly InmersivoPremiumDeliveryItem[] = [
  {
    id: "rb-ready",
    source: "runbook",
    area: "READY",
    status: "ok",
    description: "Golden path / `pnpm gate` when 3D/immersive-related web surfaces ship in the same release train.",
  },
  {
    id: "rb-brief",
    source: "runbook",
    area: "BRIEF & CONCEPT",
    status: "ok",
    description: "Brief + boards + interaction map — cross-check `/os/contenido-copywriting-premium/preview` when copy ships with UX.",
  },
  {
    id: "rb-model",
    source: "runbook",
    area: "3D MODELING",
    status: "ok",
    description: "Topology/scale/rig honest — formats: model_3d, animation_3d, AR, VR, product visualizer, interactive scene, motion_3d.",
  },
  {
    id: "rb-texture",
    source: "runbook",
    area: "TEXTURING",
    status: "warn",
    description: "PBR vs stylized, UDIM/tiles, brand palette traceability — no auto-CAD promises.",
  },
  {
    id: "rb-anim",
    source: "runbook",
    area: "ANIMATION",
    status: "ok",
    description: "Rig limits, clip list, export rules — no engine API hooks from this template.",
  },
  {
    id: "rb-perf",
    source: "runbook",
    area: "OPTIMIZATION",
    status: "warn",
    description: "Draw calls, texture memory, compression targets for agreed device class.",
  },
  {
    id: "rb-delivery",
    source: "runbook",
    area: "DELIVERY",
    status: "warn",
    description: "glTF/USDZ/binary naming + checksums — `/os/web-premium/preview` when embed story applies.",
  },
  {
    id: "rb-reporting",
    source: "runbook",
    area: "REPORTING",
    status: "ok",
    description: "Engagement claims limited — `/help` for store/IP edge cases.",
  },
  {
    id: "tmpl-ds-v2",
    source: "template",
    area: "Design System v2",
    status: "ok",
    description:
      "3D y Contenido Inmersivo Premium preview uses `@/design-system` semantic tokens and NelvyonDs components; compare with `/os/design-system`.",
  },
  {
    id: "tmpl-sections",
    source: "template",
    area: "Deliverable modules",
    status: "ok",
    description:
      "Brief/concept, modeling, texturing, animation, optimization, delivery/formats, reporting — P1–P3 + format badges where set.",
  },
  {
    id: "tmpl-meta",
    source: "template",
    area: "Metadata helper",
    status: "ok",
    description: "`buildInmersivoPremiumMetadata` for preview OG/Twitter defaults.",
  },
  {
    id: "tmpl-no-apis",
    source: "template",
    area: "No 3D/render APIs",
    status: "ok",
    description: "No Unity/Unreal/Blender cloud render or WebXR host APIs from this OS template.",
  },
  {
    id: "tmpl-cross-video",
    source: "template",
    area: "Cross-surfaces",
    status: "ok",
    description: "When hero motion or cutdowns tie in, spot-check `/os/video-multimedia-premium/preview` for alignment.",
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
    description: "`/os/3d-inmersivo-premium/preview` at mobile / tablet / desktop, clean console.",
  },
] as const;
