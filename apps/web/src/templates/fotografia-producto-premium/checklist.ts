/**
 * OS delivery QA aligned with backend/ops/runbooks/fotografia_producto_premium_nelvyon_v1.md
 * v2: NELVYON Design System primitives applied — see `/os/design-system`.
 */

export type FotografiaPremiumDeliveryStatus = "ok" | "warn" | "crit" | "pending";

export interface FotografiaPremiumDeliveryItem {
  id: string;
  source: "runbook" | "template";
  area: string;
  description: string;
  status: FotografiaPremiumDeliveryStatus;
}

export const FOTOGRAFIA_PREMIUM_DELIVERY_ITEMS: readonly FotografiaPremiumDeliveryItem[] = [
  {
    id: "rb-ready",
    source: "runbook",
    area: "READY",
    status: "ok",
    description: "Golden path / `pnpm gate` when photo-related web surfaces ship in the same release train.",
  },
  {
    id: "rb-brief",
    source: "runbook",
    area: "BRIEF & MOODBOARD",
    status: "ok",
    description: "Brief + references + styling notes — cross-check `/app/branding` for packshot rules.",
  },
  {
    id: "rb-session",
    source: "runbook",
    area: "SESSION & DIRECTION",
    status: "ok",
    description: "Lighting plan, set list, safety — formats: pack_ecommerce, lifestyle, fondo_blanco, detalle, editorial, 360_product, still_life.",
  },
  {
    id: "rb-select",
    source: "runbook",
    area: "SELECTION & EDITING",
    status: "warn",
    description: "Cull rules, crops, proofing rounds — no unlimited revision implied.",
  },
  {
    id: "rb-retouch",
    source: "runbook",
    area: "RETOUCH & COLOR",
    status: "warn",
    description: "Product integrity, dust scope, match physical samples — no AI upscaling promises from OS.",
  },
  {
    id: "rb-web",
    source: "runbook",
    area: "WEB OPTIMIZATION",
    status: "ok",
    description: "sRGB, dimensions, weight targets — `/os/web-premium/preview` when LCP story binds to stills.",
  },
  {
    id: "rb-delivery",
    source: "runbook",
    area: "DELIVERY",
    status: "warn",
    description: "Naming, folders, checksums — no DAM/CDN upload APIs from this template.",
  },
  {
    id: "rb-reporting",
    source: "runbook",
    area: "REPORTING",
    status: "ok",
    description: "Channel metrics limited to definitions — `/help` for model release / marketplace policy.",
  },
  {
    id: "tmpl-ds-v2",
    source: "template",
    area: "Design System v2",
    status: "ok",
    description:
      "Fotografía de Producto Premium preview uses `@/design-system` semantic tokens and NelvyonDs components; compare with `/os/design-system`.",
  },
  {
    id: "tmpl-sections",
    source: "template",
    area: "Deliverable modules",
    status: "ok",
    description:
      "Brief/moodboard, session/direction, selection/edit, retouch/color, web optimization, delivery/formats, reporting — P1–P3 + format badges where set.",
  },
  {
    id: "tmpl-meta",
    source: "template",
    area: "Metadata helper",
    status: "ok",
    description: "`buildFotografiaPremiumMetadata` for preview OG/Twitter defaults.",
  },
  {
    id: "tmpl-no-apis",
    source: "template",
    area: "No storage/CDN APIs",
    status: "ok",
    description: "No S3, Cloudinary, Imgix, or similar hooks from this OS template.",
  },
  {
    id: "tmpl-cross-video",
    source: "template",
    area: "Cross-surfaces",
    status: "ok",
    description: "When motion ties in, spot-check `/os/video-multimedia-premium/preview` for continuity.",
  },
  {
    id: "tmpl-cross-3d",
    source: "template",
    area: "CG composite",
    status: "ok",
    description: "When CG + stills merge, align notes with `/os/3d-inmersivo-premium/preview` expectations.",
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
    description: "`/os/fotografia-producto-premium/preview` at mobile / tablet / desktop, clean console.",
  },
] as const;
