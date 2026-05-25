"use client";

import type { LandingBlock } from "@/features/builders/types";

import { BlockSection, str } from "../shared";
import { useInViewportRef } from "../useInViewport";
import { useWebGL } from "../useWebGL";
import { Product3dFallback } from "./fallbacks";
import { Product3dScene } from "./Product3dScene";

export function Product3dBlock({ block }: { block: LandingBlock }) {
  const p = block.props;
  const title = str(p.title, str(p.headline, "Product"));
  const subtitle = str(p.subheadline, str(p.description));
  const { ref, visible } = useInViewportRef("200px");
  const webglSupported = useWebGL();
  const webgl = visible && webglSupported;

  return (
    <BlockSection block={block}>
      <div ref={ref}>
        {webgl ? (
          <div className="mx-auto h-[360px] max-w-2xl overflow-hidden rounded-2xl border border-border/50 shadow-elevated">
            <Product3dScene />
          </div>
        ) : (
          <Product3dFallback subtitle={subtitle} title={title} />
        )}
        {webgl && subtitle ? <p className="mt-6 text-center text-muted-foreground">{subtitle}</p> : null}
      </div>
    </BlockSection>
  );
}
