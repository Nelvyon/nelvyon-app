"use client";

import * as React from "react";

import { cn } from "@/core/ui/utils";

export interface NelvyonDsCardProps extends React.HTMLAttributes<HTMLElement> {
  as?: "article" | "section" | "div";
  /** When set, card is labelled for screen readers */
  title?: string;
  titleId?: string;
}

export function NelvyonDsCard({ as: Tag = "article", className, title, titleId, children, ...props }: NelvyonDsCardProps) {
  const genId = React.useId();
  const headingId = title ? (titleId ?? genId) : undefined;
  return (
    <Tag
      aria-labelledby={headingId}
      className={cn("rounded-xl border border-border bg-card p-4 text-card-foreground shadow-card", className)}
      {...props}
    >
      {title ? (
        <h3 className="mb-3 text-subsection text-foreground" id={headingId}>
          {title}
        </h3>
      ) : null}
      {children}
    </Tag>
  );
}
