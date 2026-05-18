import type { HTMLAttributes } from "react";
import React from "react";

import { cn } from "@/core/ui/utils";

/** Pulse block; use for skeleton layouts (contrast via `bg-muted`). */
export function Skeleton({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted/90 dark:bg-muted", className)}
      role="presentation"
      {...rest}
    />
  );
}

const listShell = "overflow-hidden rounded-lg border border-border bg-card shadow-card";

/** Generic list placeholder (CRM, inbox, jobs index, etc.). */
export function SkeletonListRows({ rows = 6, "aria-label": ariaLabel = "Loading list" }: { rows?: number; "aria-label"?: string }) {
  return (
    <div aria-busy="true" aria-label={ariaLabel} className={listShell}>
      <ul className="divide-y divide-border">
        {Array.from({ length: rows }, (_, i) => (
          <li className="flex items-center gap-3 px-3 py-3" key={i}>
            <Skeleton className="h-4 max-w-md flex-1" />
            <Skeleton className="h-3 w-16 shrink-0 sm:w-24" />
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Detail pages: one primary card + secondary lines. */
export function SkeletonDetailCard() {
  return (
    <div aria-busy="true" aria-label="Loading record" className="space-y-4">
      <div className={cn(listShell, "p-4")}>
        <Skeleton className="h-6 w-2/3 max-w-md" />
        <div className="mt-4 space-y-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-[88%]" />
          <Skeleton className="h-3 w-[72%]" />
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>
    </div>
  );
}

/** Settings tenant profile block. */
export function SkeletonFormCard({ fields = 4 }: { fields?: number }) {
  return (
    <div aria-busy="true" aria-label="Loading form" className={cn(listShell, "space-y-4 p-4")}>
      {Array.from({ length: fields }, (_, i) => (
        <div className="space-y-2" key={i}>
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-9 w-full max-w-lg" />
        </div>
      ))}
    </div>
  );
}
