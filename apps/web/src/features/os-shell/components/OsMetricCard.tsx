"use client";

import type { LucideIcon } from "lucide-react";

export function OsMetricCard({
  label,
  value,
  sub,
  icon: Icon,
  emptyLabel = "Sin datos todavía",
}: {
  label: string;
  value: number | string | null;
  sub?: string | null;
  icon: LucideIcon;
  emptyLabel?: string;
}) {
  const hasValue = value !== null && value !== undefined && value !== "";
  const display = hasValue ? value : emptyLabel;
  const isEmpty = !hasValue;

  return (
    <div className="rounded-xl border border-white/10 bg-[#0b1428] p-5 shadow-[0_8px_32px_rgba(0,0,0,0.35)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-white/50">{label}</p>
          <p
            className={
              isEmpty
                ? "mt-2 text-sm text-white/40"
                : "mt-2 text-2xl font-semibold tabular-nums text-white"
            }
          >
            {display}
          </p>
          {sub && hasValue ? <p className="mt-1 text-xs text-white/45">{sub}</p> : null}
        </div>
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0084FF]/15 text-[#0084FF]">
          <Icon className="h-5 w-5" aria-hidden />
        </span>
      </div>
    </div>
  );
}
