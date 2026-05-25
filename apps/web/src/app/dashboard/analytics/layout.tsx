"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { DashboardPageTransition } from "@/features/dashboard/components/DashboardTabs";
import { cn } from "@/core/ui/utils";

const TABS = [
  { href: "/dashboard/analytics/benchmarks", label: "Benchmarks" },
  { href: "/dashboard/analytics/lead-scoring", label: "Lead Scoring" },
  { href: "/dashboard/analytics/churn", label: "Churn" },
] as const;

export default function AnalyticsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <DashboardPageTransition>
      <div className="mb-4">
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-sm text-muted-foreground">Benchmarking, lead scoring IA y predicción de churn</p>
      </div>
      <nav className="mb-6 flex flex-wrap gap-1 border-b border-border">
        {TABS.map((t) => (
          <Link
            className={cn(
              "min-h-[44px] px-4 py-2 text-sm transition-colors",
              pathname === t.href || (pathname?.startsWith(`${t.href}/`) ?? false)
                ? "border-b-2 border-primary font-medium text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
            href={t.href}
            key={t.href}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      {children}
    </DashboardPageTransition>
  );
}
