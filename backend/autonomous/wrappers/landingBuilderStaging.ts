/**
 * Phase H — isolated wrapper mirroring landing_builder_service block model.
 * No DB writes, no production deploy, no portal publish.
 */

import {
  renderLandingStagingHtml,
  type LandingBlock,
} from "../preview/renderLandingStagingHtml";

export interface LandingStagingBuildInput {
  brief: Record<string, unknown>;
  copy: Record<string, unknown>;
  design: Record<string, unknown>;
}

export interface AssetsManifest {
  version: number;
  builder: string;
  html_file: string;
  css_mode: "inline";
  assets: Array<{ slot: string; url: string; alt?: string }>;
}

export interface PreviewMetadata {
  phase: "H";
  builder: string;
  preview_path: string;
  generated_at: string;
  block_count: number;
  template_category: string;
  production_deploy: false;
  staging_only: true;
}

export interface LandingStagingBuildResult {
  html: string;
  blocks: LandingBlock[];
  assets_manifest: AssetsManifest;
  preview_metadata: PreviewMetadata;
  build: Record<string, unknown>;
}

export function buildLandingBlocksFromArtifacts(input: LandingStagingBuildInput): LandingBlock[] {
  const { brief, copy, design } = input;
  const hero = copy.hero as { headline?: string; subheadline?: string; cta_label?: string } | undefined;
  const meta = copy.meta as { title?: string; description?: string } | undefined;
  const tokens = (design.tokens as { primary?: string; secondary?: string }) ?? {};
  const brand = brief.brand as { primary_color?: string; secondary_color?: string; logo_url?: string } | undefined;
  const photos = (brief.photos_placeholder as Array<{ url?: string; alt?: string }>) ?? [];
  const offer = brief.offer as { headline?: string; promotion?: string; includes?: string[] } | undefined;
  const location = brief.location as { address?: string; city?: string; parking_note?: string } | undefined;
  const reviews = (brief.social_proof as Array<{ text?: string; author?: string }>) ?? [];
  const company = String(brief.company_name ?? "Restaurante");

  const primary = tokens.primary ?? brand?.primary_color ?? "#B45309";
  const secondary = tokens.secondary ?? brand?.secondary_color ?? "#1C1917";
  const heroImg = photos[0]?.url ?? (design.assets as Array<{ url?: string }> | undefined)?.[0]?.url ?? "";

  const offerText = [
    offer?.headline,
    offer?.promotion,
    offer?.includes?.length ? `Incluye: ${offer.includes.join(", ")}` : "",
  ]
    .filter(Boolean)
    .join(" · ");

  const blocks: LandingBlock[] = [
    {
      id: "blk_hero",
      type: "hero",
      props: {
        headline: hero?.headline ?? company,
        subheadline: hero?.subheadline ?? String(brief.value_proposition ?? ""),
        ctaText: hero?.cta_label ?? String(brief.primary_cta ?? "Reservar mesa"),
        ctaUrl: "#reservar",
        imageUrl: heroImg,
        backgroundColor: secondary,
        textColor: "#FFFBEB",
        primaryColor: primary,
      },
    },
    {
      id: "blk_offer",
      type: "text",
      props: { content: offerText || String(brief.value_proposition ?? "") },
    },
    {
      id: "blk_testimonials",
      type: "testimonials",
      props: {
        items: reviews.slice(0, 4).map((r) => ({
          quote: r.text ?? "",
          author: r.author ?? "Cliente",
        })),
      },
    },
  ];

  for (let i = 1; i < Math.min(photos.length, 3); i++) {
    const p = photos[i];
    if (p?.url) {
      blocks.push({
        id: `blk_gallery_${i}`,
        type: "image",
        props: { imageUrl: p.url, alt: p.alt ?? `${company} foto ${i}` },
      });
    }
  }

  blocks.push({
    id: "blk_cta",
    type: "cta",
    props: {
      headline: offer?.headline ?? "Reserva directa en web",
      subheadline: offer?.promotion ?? "Sin comisiones de apps de delivery",
      buttonText: hero?.cta_label ?? String(brief.primary_cta ?? "Reservar mesa"),
      buttonUrl: "#reservar",
      backgroundColor: primary,
      textColor: "#FFFBEB",
    },
  });

  blocks.push({
    id: "blk_location",
    type: "faq",
    props: {
      items: [
        {
          question: "Dirección",
          answer: [location?.address, location?.city].filter(Boolean).join(", "),
        },
        location?.parking_note ? { question: "Parking", answer: location.parking_note } : null,
      ].filter(Boolean),
    },
  });

  void meta;
  return blocks;
}

export function buildLandingStagingIsolated(input: LandingStagingBuildInput): LandingStagingBuildResult {
  const blocks = buildLandingBlocksFromArtifacts(input);
  const copy = input.copy;
  const meta = copy.meta as { title?: string; description?: string; schema?: Record<string, unknown> } | undefined;
  const photos = (input.brief.photos_placeholder as Array<{ url?: string; alt?: string }>) ?? [];
  const brand = input.brief.brand as { logo_url?: string } | undefined;
  const host = (input.brief.domain as { host?: string })?.host ?? "preview.staging.local";

  const html = renderLandingStagingHtml({
    brief: input.brief,
    copy: input.copy,
    design: input.design,
    blocks,
    meta,
  });

  const assets: AssetsManifest["assets"] = [];
  if (brand?.logo_url) assets.push({ slot: "logo", url: brand.logo_url });
  photos.forEach((p, i) => {
    if (p.url) assets.push({ slot: i === 0 ? "hero_image" : `gallery_${i}`, url: p.url, alt: p.alt });
  });

  const assets_manifest: AssetsManifest = {
    version: 1,
    builder: "landing_builder_staging_wrapper",
    html_file: "preview.html",
    css_mode: "inline",
    assets,
  };

  const preview_metadata: PreviewMetadata = {
    phase: "H",
    builder: "landing_builder_staging_wrapper",
    preview_path: "preview.html",
    generated_at: new Date().toISOString(),
    block_count: blocks.length,
    template_category: "restaurante",
    production_deploy: false,
    staging_only: true,
  };

  const build = {
    version: 2,
    staging_url: `mock://autonomous/phase-h/${host}/preview.html`,
    preview_file: "preview.html",
    builder_ref: "landing_builder_service",
    builder_mode: "staging_blocks_export",
    build_id: `staging_build_${Date.now()}`,
    isolated: true,
    production_deploy: false,
    block_count: blocks.length,
    responsive_breakpoints: [375, 768, 1280],
    deliverable_pack_ready: true,
    lighthouse_mobile: null,
  };

  return { html, blocks, assets_manifest, preview_metadata, build };
}
