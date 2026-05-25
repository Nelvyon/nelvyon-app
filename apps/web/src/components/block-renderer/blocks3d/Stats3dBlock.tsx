"use client";

import type { LandingBlock } from "@/features/builders/types";

import { BlockSection } from "../shared";
import { useInViewportRef } from "../useInViewport";
import { useWebGL } from "../useWebGL";
import { Stats3dFallback } from "./fallbacks";
import { Stats3dScene } from "./Stats3dScene";

export function Stats3dBlock({ block }: { block: LandingBlock }) {
  const stats = (block.props.stats as { label?: string; value?: string }[]) ?? [];
  const { ref, visible } = useInViewportRef("200px");
  const webglSupported = useWebGL();
  const webgl = visible && webglSupported;

  return (
    <BlockSection block={block}>
      <div ref={ref}>
        {webgl ? (
          <div className="mx-auto h-[320px] max-w-4xl overflow-hidden rounded-2xl border border-border/50">
            <Stats3dScene stats={stats} />
          </div>
        ) : (
          <Stats3dFallback stats={stats.length ? stats : [{ label: "Users", value: "10k+" }]} />
        )}
      </div>
    </BlockSection>
  );
}
