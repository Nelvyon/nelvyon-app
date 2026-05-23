"use client";

import { cn } from "@/core/ui/utils";

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
    <div className="flex flex-wrap gap-1 border-b">
      {tabs.map((t) => (
        <button
          className={cn(
            "px-4 py-2 text-sm transition-colors",
            active === t.id ? "border-b-2 border-primary font-medium text-foreground" : "text-muted-foreground hover:text-foreground",
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

export function MetricGrid({ items }: { items: { label: string; value: string | number }[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((m) => (
        <div className="rounded-xl border bg-card p-4 shadow-card" key={m.label}>
          <p className="text-xs text-muted-foreground">{m.label}</p>
          <p className="mt-1 text-2xl font-bold">{m.value}</p>
        </div>
      ))}
    </div>
  );
}
