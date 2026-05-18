import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/core/ui/utils";

const nelvyonDsBadgeVariants = cva(
  "inline-flex max-w-full items-center rounded-md border px-2 py-0.5 text-xs font-semibold leading-none",
  {
    variants: {
      tone: {
        neutral: "border-border bg-muted text-foreground",
        primary: "border-primary/30 bg-primary/10 text-primary",
        success: "border-success/30 bg-success/10 text-success",
        warning: "border-warning/40 bg-warning/15 text-warning-foreground dark:text-warning",
        danger: "border-destructive/30 bg-destructive/10 text-destructive",
      },
    },
    defaultVariants: {
      tone: "neutral",
    },
  },
);

export type NelvyonDsBadgeProps = React.HTMLAttributes<HTMLSpanElement> &
  VariantProps<typeof nelvyonDsBadgeVariants> & {
    /** Accessible label when badge text is abbreviated */
    label?: string;
  };

export function NelvyonDsBadge({ className, tone, label, children, ...props }: NelvyonDsBadgeProps) {
  return (
    <span className={cn(nelvyonDsBadgeVariants({ tone, className }))} title={label} {...props}>
      {children}
    </span>
  );
}
