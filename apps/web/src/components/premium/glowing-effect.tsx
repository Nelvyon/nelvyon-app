"use client";

import type { ReactNode } from "react";

import { GlowingEffect as GlowingEffectUi } from "@/components/ui/glowing-effect";
import { cn } from "@/lib/utils";

export type GlowingEffectProps = {
  children: ReactNode;
  className?: string;
};

/** Glowing Effect — borde interactivo en tarjetas premium. */
export function GlowingEffect({ children, className }: GlowingEffectProps) {
  return (
    <div
      className={cn(
        "nelvyon-glowing-card relative h-full min-h-[14rem] rounded-2xl border border-white/10 p-0.5 md:rounded-3xl md:p-1",
        className,
      )}
    >
      <GlowingEffectUi
        spread={40}
        glow
        disabled={false}
        proximity={64}
        inactiveZone={0.01}
        variant="nelvyon"
        borderWidth={1}
      />
      <div className="relative flex h-full flex-col">{children}</div>
    </div>
  );
}
