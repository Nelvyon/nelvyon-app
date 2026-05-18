import type { ReactNode } from "react";
import React from "react";

import { cn } from "@/core/ui/utils";

export type BadgeTone = "neutral" | "success" | "warning" | "destructive";

const toneClasses: Record<BadgeTone, string> = {
  neutral: "border-border bg-muted/70 text-foreground dark:bg-muted/50",
  success: "border-success/40 bg-success/15 text-success-foreground dark:bg-success/25",
  warning: "border-warning/45 bg-warning/15 text-warning-foreground dark:bg-warning/25",
  destructive: "border-destructive/40 bg-destructive/12 text-destructive dark:bg-destructive/20",
};

export function Badge({ tone = "neutral", children, className }: { tone?: BadgeTone; children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center truncate rounded-full border px-2 py-0.5 text-xs font-medium leading-tight",
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function toneFromInvoiceStatus(status: string): BadgeTone {
  const s = status.toLowerCase();
  if (s.includes("paid") || s.includes("complete") || s.includes("success")) return "success";
  if (s.includes("pending") || s.includes("open") || s.includes("draft")) return "warning";
  if (s.includes("fail") || s.includes("void") || s.includes("uncollect")) return "destructive";
  return "neutral";
}

export function toneFromMeterStatus(status: string): BadgeTone {
  const s = status.toLowerCase();
  if (s.includes("ok") || s.includes("good") || s.includes("within")) return "success";
  if (s.includes("warn") || s.includes("near") || s.includes("limit")) return "warning";
  if (s.includes("over") || s.includes("exceed") || s.includes("block")) return "destructive";
  return "neutral";
}
