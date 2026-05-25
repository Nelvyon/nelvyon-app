"use client";

import type { LandingBlock } from "@/features/builders/types";

import { BlockSection, str } from "../shared";
import { useInViewportRef } from "../useInViewport";
import { useWebGL } from "../useWebGL";
import { Hero3dFallback } from "./fallbacks";
import { Hero3dScene } from "./Hero3dScene";

export function Hero3dBlock({ block }: { block: LandingBlock }) {
  const p = block.props;
  const headline = str(p.headline, "Welcome");
  const subheadline = str(p.subheadline);
  const ctaText = str(p.ctaText);
  const ctaUrl = str(p.ctaUrl, "#");
  const imageUrl = str(p.imageUrl);
  const { ref, visible } = useInViewportRef("200px");
  const webglSupported = useWebGL();
  const webgl = visible && webglSupported;

  return (
    <BlockSection block={block} className="!px-0">
      <div ref={ref} className="relative min-h-[480px] overflow-hidden rounded-3xl">
        {webgl ? (
          <div className="absolute inset-0">
            <Hero3dScene />
          </div>
        ) : (
          <Hero3dFallback ctaText={ctaText} ctaUrl={ctaUrl} headline={headline} imageUrl={imageUrl} subheadline={subheadline} />
        )}
        {webgl ? (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent px-6 py-20 text-center">
            <h1 className="pointer-events-auto text-4xl font-bold tracking-tight text-white drop-shadow-lg md:text-6xl">{headline}</h1>
            {subheadline ? <p className="pointer-events-auto mt-6 max-w-2xl text-lg text-white/90 md:text-xl">{subheadline}</p> : null}
            {ctaText ? (
              <a
                className="pointer-events-auto mt-10 inline-flex min-h-[48px] items-center rounded-full bg-white px-10 py-3 text-sm font-semibold text-slate-900 shadow-elevated transition hover:scale-[1.03]"
                href={ctaUrl}
              >
                {ctaText}
              </a>
            ) : null}
          </div>
        ) : null}
      </div>
    </BlockSection>
  );
}
