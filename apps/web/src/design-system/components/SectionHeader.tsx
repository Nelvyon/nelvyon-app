import * as React from "react";

import { cn } from "@/core/ui/utils";

export interface NelvyonDsSectionHeaderProps {
  id?: string;
  eyebrow?: string;
  title: string;
  subtitle?: React.ReactNode;
  className?: string;
}

/**
 * OS / dashboard section title pattern — tight tracking, calm hierarchy (Linear-like).
 */
export function NelvyonDsSectionHeader({ id, eyebrow, title, subtitle, className }: NelvyonDsSectionHeaderProps) {
  return (
    <header className={cn("space-y-1 border-b border-border pb-4", className)}>
      {eyebrow ? (
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{eyebrow}</p>
      ) : null}
      <h2 className="text-page font-semibold tracking-tight text-foreground" id={id}>
        {title}
      </h2>
      {subtitle ? <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">{subtitle}</p> : null}
    </header>
  );
}
