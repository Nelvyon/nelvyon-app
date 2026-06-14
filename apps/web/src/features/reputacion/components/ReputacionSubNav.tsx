"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const TABS = [
  { href: "/reputacion", label: "Resumen", exact: true },
  { href: "/reputacion/resenas", label: "Reseñas", exact: false },
  { href: "/reputacion/alertas", label: "Alertas", exact: false },
  { href: "/reputacion/widgets", label: "Widgets", exact: false },
  { href: "/analytics/reputacion", label: "Analytics", exact: false },
] as const;

export function ReputacionSubNav() {
  const pathname = usePathname() ?? "";

  return (
    <nav
      aria-label="Navegación Reputación"
      className="flex flex-wrap gap-1 rounded-lg border border-border bg-muted/30 p-1"
    >
      {TABS.map((tab) => {
        const active = tab.exact
          ? pathname === tab.href
          : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        return (
          <Link
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              active
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:bg-background/60 hover:text-foreground",
            )}
            href={tab.href}
            key={tab.href}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function ReputacionMockBadge({ mock }: { mock?: boolean }) {
  if (!mock) return null;
  return (
    <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">
      Datos demo
    </span>
  );
}
