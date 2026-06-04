"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { usePathname } from "next/navigation";

import { osShellBreadcrumbs } from "@/features/os-shell/osShellNav";

export function OsShellBreadcrumbs() {
  const pathname = usePathname() ?? "/os/dashboard";
  const crumbs = osShellBreadcrumbs(pathname);

  return (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-sm text-white/60">
      {crumbs.map((crumb, i) => {
        const isLast = i === crumbs.length - 1;
        return (
          <span key={crumb.href} className="flex items-center gap-1">
            {i > 0 ? <ChevronRight className="h-3.5 w-3.5 opacity-50" aria-hidden /> : null}
            {isLast ? (
              <span className="font-medium text-white">{crumb.label}</span>
            ) : (
              <Link className="hover:text-[#0084FF]" href={crumb.href}>
                {crumb.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
