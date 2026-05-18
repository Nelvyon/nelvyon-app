/**
 * OS delivery QA aligned with backend/ops/runbooks/video_multimedia_premium_nelvyon_v1.md
 * v2: NELVYON Design System primitives applied — see `/os/design-system`.
 */

export type VideoPremiumDeliveryStatus = "ok" | "warn" | "crit" | "pending";

export interface VideoPremiumDeliveryItem {
  id: string;
  source: "runbook" | "template";
  area: string;
  description: string;
  status: VideoPremiumDeliveryStatus;
}

export const VIDEO_PREMIUM_DELIVERY_ITEMS: readonly VideoPremiumDeliveryItem[] = [
  {
    id: "rb-ready",
    source: "runbook",
    area: "READY",
    status: "ok",
    description: "Golden path / `pnpm gate` when video-related web surfaces ship in the same release train.",
  },
  {
    id: "rb-brief",
    source: "runbook",
    area: "BRIEF & SCRIPT",
    status: "ok",
    description: "Brief, script, approvals — cross-check `/os/contenido-copywriting-premium/preview` when copy is bundled.",
  },
  {
    id: "rb-production",
    source: "runbook",
    area: "PRODUCTION",
    status: "ok",
    description: "Gear, crew, animation scope honest — formats: corporate, social clip, reel, explainer, testimonial, ad video, podcast, motion graphics.",
  },
  {
    id: "rb-edit",
    source: "runbook",
    area: "EDIT & POST",
    status: "warn",
    description: "Edit rounds, color, mix, masters — realistic SLAs; no cloud render APIs from this template.",
  },
  {
    id: "rb-mograph",
    source: "runbook",
    area: "MOGRAPH",
    status: "ok",
    description: "Lower-thirds, bumpers, brand motion scope explicit when motion graphics format applies.",
  },
  {
    id: "rb-a11y",
    source: "runbook",
    area: "SUBTITLES & A11Y",
    status: "ok",
    description: "Caption languages, sidecar vs burn-in — `/help` for legal/accessibility edge cases.",
  },
  {
    id: "rb-delivery",
    source: "runbook",
    area: "DELIVERY",
    status: "warn",
    description: "Mezzanine + social masters + naming; no Vimeo/YouTube upload APIs from OS paperwork.",
  },
  {
    id: "rb-reporting",
    source: "runbook",
    area: "REPORTING",
    status: "ok",
    description: "View/retention KPIs with baselines — expectations only in-template.",
  },
  {
    id: "tmpl-ds-v2",
    source: "template",
    area: "Design System v2",
    status: "ok",
    description:
      "Video y Multimedia Premium preview uses `@/design-system` semantic tokens and NelvyonDs components; compare with `/os/design-system`.",
  },
  {
    id: "tmpl-sections",
    source: "template",
    area: "Deliverable modules",
    status: "ok",
    description:
      "Brief/script, production, edit/post, mograph, subtitles/a11y, delivery/formats, reporting — P1–P3 + format badges where set.",
  },
  {
    id: "tmpl-meta",
    source: "template",
    area: "Metadata helper",
    status: "ok",
    description: "`buildVideoPremiumMetadata` for preview OG/Twitter defaults.",
  },
  {
    id: "tmpl-no-apis",
    source: "template",
    area: "No video APIs",
    status: "ok",
    description: "No transcode, CDN, or generative video SaaS wiring from this OS template.",
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
    description: "`/os/video-multimedia-premium/preview` at mobile / tablet / desktop, clean console.",
  },
] as const;
