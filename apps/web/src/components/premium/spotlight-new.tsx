"use client";

import type { ReactNode } from "react";

import { Spotlight } from "@/components/ui/spotlight-new";
import { cn } from "@/lib/utils";

export type SpotlightNewProps = {
  children: ReactNode;
  className?: string;
  subtle?: boolean;
};

/** Spotlight New — atmósfera Hero (NELVYON #0084FF / #0047AB). */
export function SpotlightNew({ children, className, subtle = false }: SpotlightNewProps) {
  return (
    <div className={cn("nelvyon-spotlight-new relative overflow-hidden", className)}>
      <Spotlight subtle={subtle} />
      <div className="relative z-10 flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
