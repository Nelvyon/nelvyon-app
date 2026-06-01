import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type BentoGridProps = {
  children: ReactNode;
  className?: string;
};

/** Grid bento reutilizable — uso futuro en /saas, /servicios y sectores. */
export function BentoGrid({ children, className }: BentoGridProps) {
  return <div className={cn("nelvyon-bento-grid", className)}>{children}</div>;
}

export type BentoGridItemProps = {
  children: ReactNode;
  className?: string;
  span?: "default" | "wide" | "tall" | "hero";
};

export function BentoGridItem({ children, className, span = "default" }: BentoGridItemProps) {
  return (
    <article className={cn("nelvyon-bento-grid__item", `nelvyon-bento-grid__item--${span}`, className)}>
      {children}
    </article>
  );
}
