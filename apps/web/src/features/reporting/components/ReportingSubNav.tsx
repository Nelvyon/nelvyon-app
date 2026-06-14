"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/core/ui/utils";

const LINKS = [
  { href: "/analytics", label: "Centro", exact: true },
  { href: "/analytics/revenue", label: "Revenue", exact: false },
  { href: "/analytics/publicidad", label: "Publicidad", exact: false },
  { href: "/analytics/social", label: "Social", exact: false },
  { href: "/analytics/tickets", label: "Helpdesk", exact: false },
  { href: "/analytics/campaigns", label: "Campañas", exact: false },
  { href: "/analytics/reportes", label: "Reportes", exact: false },
];

export function ReportingSubNav() {
  const pathname = usePathname() ?? "";

  return (
    <nav aria-label="Analytics" className="flex flex-wrap gap-2 border-b border-border pb-3">
      {LINKS.map((link) => {
        const active = link.exact ? pathname === link.href : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
            href={link.href}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
