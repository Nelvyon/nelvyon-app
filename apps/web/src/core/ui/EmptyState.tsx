import type { ReactNode } from "react";
import React from "react";

import { Package } from "lucide-react";

import { cn } from "@/core/ui/utils";

interface EmptyStateProps {
  title: string;
  description?: ReactNode;
  icon?: ReactNode;
  /** Optional primary action (e.g. link button) below the copy. */
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ title, description, icon, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-muted/30 px-5 py-10 text-center shadow-card",
        className,
      )}
      role="status"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground ring-1 ring-border/60">
        {icon ?? <Package aria-hidden className="h-5 w-5" />}
      </span>
      <p className="text-base font-semibold tracking-tight text-foreground">{title}</p>
      {description ? <div className="max-w-md text-sm leading-relaxed text-muted-foreground">{description}</div> : null}
      {action ? <div className="mt-1 flex flex-wrap justify-center gap-2">{action}</div> : null}
    </div>
  );
}
