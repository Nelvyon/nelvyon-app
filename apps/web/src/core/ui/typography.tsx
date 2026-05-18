import type { HTMLAttributes, ReactNode } from "react";
import React from "react";

import { cn } from "@/core/ui/utils";

/** H1 — page title (shell route header or standalone pages). */
export function PageTitle({ children, className, ...rest }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h1 className={cn("text-page text-foreground md:text-page-md", className)} {...rest}>
      {children}
    </h1>
  );
}

/** H2 — major sections inside a page. */
export function SectionTitle({ children, className, ...rest }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2 className={cn("text-section text-foreground", className)} {...rest}>
      {children}
    </h2>
  );
}

/** H3 — subsections, card group titles. */
export function SubsectionTitle({ children, className, ...rest }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn("text-subsection text-foreground", className)} {...rest}>
      {children}
    </h3>
  );
}

/** Muted lead under a section title. */
export function SectionLead({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("text-xs text-muted-foreground", className)}>{children}</p>;
}
