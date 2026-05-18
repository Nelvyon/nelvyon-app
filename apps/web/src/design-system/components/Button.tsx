"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/core/ui/utils";

export const nelvyonDsButtonVariants = cva(
  "inline-flex shrink-0 items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground shadow-card hover:bg-primary/90",
        secondary: "border border-border bg-secondary text-secondary-foreground shadow-card hover:bg-secondary/80",
        ghost: "text-foreground hover:bg-muted",
        danger: "bg-destructive text-destructive-foreground shadow-card hover:bg-destructive/90",
      },
      size: {
        sm: "h-8 gap-1.5 rounded-md px-3 text-xs",
        md: "h-10 gap-2 rounded-md px-4 text-sm",
        lg: "h-11 gap-2 rounded-md px-5 text-sm font-semibold",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export type NelvyonDsButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof nelvyonDsButtonVariants> & {
    asChild?: boolean;
  };

export const NelvyonDsButton = React.forwardRef<HTMLButtonElement, NelvyonDsButtonProps>(
  ({ className, variant, size, asChild = false, type = "button", ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(nelvyonDsButtonVariants({ variant, size, className }))} ref={ref} type={asChild ? undefined : type} {...props} />;
  },
);

NelvyonDsButton.displayName = "NelvyonDsButton";
