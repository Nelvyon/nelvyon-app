"use client";

import { cn } from "@/core/ui/utils";

export {
  DashboardListShell,
  DashboardPageTransition,
  EliteAreaChart,
  EliteModal,
  EmptyState,
  MetricCard,
  MetricGrid,
  Skeleton,
  SkeletonList,
  SkeletonMetricGrid,
  SkeletonTable,
  space,
  type MetricItem,
} from "./EliteUi";

interface Tab {
  id: string;
  label: string;
}

export function DashboardTabs({
  tabs,
  active,
  onChange,
}: {
  tabs: Tab[];
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1 border-b border-border">
      {tabs.map((t) => (
        <button
          className={cn(
            "min-h-[44px] px-4 py-2 text-sm transition-all duration-200",
            active === t.id
              ? "border-b-2 border-primary font-semibold text-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
          )}
          key={t.id}
          onClick={() => onChange(t.id)}
          type="button"
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
