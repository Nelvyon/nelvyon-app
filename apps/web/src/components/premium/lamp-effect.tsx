"use client";

import type { ReactNode } from "react";

import { LampContainer } from "@/components/ui/lamp";
import { cn } from "@/lib/utils";

export type LampEffectProps = {
  children: ReactNode;
  className?: string;
  compact?: boolean;
};

/** Lamp Effect — CTA final u otra sección clave (uso moderado). */
export function LampEffect({ children, className, compact = true }: LampEffectProps) {
  return (
    <LampContainer compact={compact} className={cn("nelvyon-lamp-effect w-full", className)}>
      {children}
    </LampContainer>
  );
}
