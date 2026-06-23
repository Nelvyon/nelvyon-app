import type { BlockCatalogEntry } from "../types";

/** Native Nelvyon blocks — extend BlockRenderer over time. */
export const NELVYON_BLOCK_CATALOG: BlockCatalogEntry[] = [
  { block_type: "hero", variant: "center-gradient", props_schema: { headline: "string", subheadline: "string", ctaText: "string", ctaUrl: "string" } },
  { block_type: "hero", variant: "split-image", props_schema: { headline: "string", subheadline: "string", imageUrl: "string", ctaText: "string" } },
  { block_type: "hero", variant: "video-bg", props_schema: { headline: "string", videoUrl: "string", ctaText: "string" } },
  { block_type: "hero_3d", variant: "aceternity-glow", props_schema: { headline: "string", subheadline: "string", accentColor: "string" } },
  { block_type: "product_3d", variant: "ecommerce-spotlight", props_schema: { productName: "string", price: "string", imageUrl: "string" } },
  { block_type: "stats_3d", variant: "metrics-row", props_schema: { stats: "array" } },
  { block_type: "social_proof", variant: "stats-4col", props_schema: { stats: "array" } },
  { block_type: "testimonials", variant: "cards-3", props_schema: { items: "array" } },
  { block_type: "pricing", variant: "three-tier", props_schema: { plans: "array" } },
  { block_type: "faq", variant: "accordion", props_schema: { items: "array" } },
  { block_type: "cta", variant: "banner-rounded", props_schema: { headline: "string", buttonText: "string", buttonUrl: "string" } },
  { block_type: "form", variant: "lead-capture", props_schema: { headline: "string", submitText: "string", fields: "array" } },
  { block_type: "form", variant: "booking", props_schema: { headline: "string", serviceType: "string" } },
  { block_type: "text", variant: "prose", props_schema: { content: "string" } },
  { block_type: "image", variant: "full-width", props_schema: { imageUrl: "string", alt: "string" } },
  { block_type: "features", variant: "icon-grid", props_schema: { items: "array" } },
  { block_type: "logos", variant: "trust-bar", props_schema: { logos: "array" } },
  { block_type: "team", variant: "cards", props_schema: { members: "array" } },
  { block_type: "gallery", variant: "masonry", props_schema: { images: "array" } },
  { block_type: "map", variant: "local-business", props_schema: { address: "string", lat: "number", lng: "number" } },
  { block_type: "hours", variant: "schedule-table", props_schema: { rows: "array" } },
  { block_type: "menu", variant: "restaurant", props_schema: { categories: "array" } },
  { block_type: "comparison", variant: "before-after", props_schema: { before: "string", after: "string" } },
  { block_type: "countdown", variant: "offer", props_schema: { endDate: "string", headline: "string" } },
  { block_type: "video", variant: "embed", props_schema: { videoUrl: "string", caption: "string" } },
];

export function getBlockCatalogEntry(blockType: string, variant: string): BlockCatalogEntry | undefined {
  return NELVYON_BLOCK_CATALOG.find((b) => b.block_type === blockType && b.variant === variant);
}
