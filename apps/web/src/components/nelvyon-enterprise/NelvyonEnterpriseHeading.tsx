import type { ReactNode } from "react";

import { cn } from "@/core/ui/utils";

type Variant = "display" | "title" | "subtitle";

const VARIANT_CLASS: Record<Variant, string> = {
  display:
    "nv-enterprise-display text-4xl font-semibold leading-[1.06] tracking-tight text-balance sm:text-5xl md:text-6xl lg:text-7xl",
  title: "nv-enterprise-title text-2xl font-semibold tracking-tight md:text-3xl lg:text-4xl",
  subtitle: "nv-enterprise-subtitle text-base leading-relaxed md:text-lg lg:text-xl",
};

export function NelvyonEnterpriseHeading({
  as: Tag = "h1",
  variant = "display",
  className,
  children,
}: {
  as?: "h1" | "h2" | "h3" | "p";
  variant?: Variant;
  className?: string;
  children: ReactNode;
}) {
  return <Tag className={cn(VARIANT_CLASS[variant], className)}>{children}</Tag>;
}
