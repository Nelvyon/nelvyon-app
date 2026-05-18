"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { NelvyonDsBadge, NelvyonDsCard } from "@/design-system/components";
import { cn } from "@/core/ui/utils";

const NAV = [
  { label: "Dashboard", href: "/admin" },
  { label: "Tenants", href: "/admin/tenants" },
  { label: "Jobs OS", href: "/admin/jobs" },
  { label: "Actividad", href: "/admin#actividad" },
  { label: "Sistema", href: "/admin#sistema" },
];

export function AdminSidebar() {
  const pathname = usePathname() ?? "";
  return (
    <aside className="space-y-4">
      <NelvyonDsCard className="space-y-4">
        <div className="text-lg font-semibold text-foreground">NELVYON ADMIN</div>
        <div className="space-y-2">
          {NAV.map((item) => {
            const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href} className={cn("block rounded-md px-3 py-2 text-sm", active ? "bg-primary/10 text-primary" : "text-muted-foreground")}>
                {item.label}
              </Link>
            );
          })}
        </div>
        <NelvyonDsBadge>ADMIN</NelvyonDsBadge>
      </NelvyonDsCard>
    </aside>
  );
}
