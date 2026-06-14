"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const TABS = [
  { href: "/social", label: "Resumen", exact: true },
  { href: "/social/scheduler", label: "Programación", exact: false },
  { href: "/social/monitoring", label: "Monitoring", exact: false },
  { href: "/social/auto-publish", label: "Auto-publicación", exact: false },
  { href: "/analytics/social", label: "Analytics", exact: false },
] as const;

export function SocialSubNav() {
  const pathname = usePathname() ?? "";

  return (
    <nav
      aria-label="Navegación Social"
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
