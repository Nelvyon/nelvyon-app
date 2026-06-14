"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const CRM_TABS = [
  { href: "/crm", label: "Resumen", exact: true },
  { href: "/crm/clients", label: "Clientes", exact: false },
  { href: "/crm/deals", label: "Pipeline", exact: false },
  { href: "/analytics/revenue", label: "Analytics", exact: false },
] as const;

export function CrmSubNav() {
  const pathname = usePathname() ?? "";

  return (
    <nav
      aria-label="Navegación Revenue"
      className="flex flex-wrap gap-1 rounded-lg border border-border bg-muted/30 p-1"
    >
      {CRM_TABS.map((tab) => {
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
