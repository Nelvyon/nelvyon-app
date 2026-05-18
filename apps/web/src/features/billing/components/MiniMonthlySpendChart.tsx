"use client";

import React, { useMemo } from "react";

import { SubsectionTitle } from "@/core/ui/typography";
import type { MonthlySpendPoint } from "@/features/billing/invoiceTrend";

const BAR_AREA_PX = 112;

/**
 * Minimal bar chart (CSS only): bar height in pixels ∝ total within the loaded series max.
 */
export function MiniMonthlySpendChart(props: {
  series: MonthlySpendPoint[];
  /** Shown under the title — cite data origin. */
  footnote: string;
}) {
  const max = useMemo(() => Math.max(...props.series.map((p) => p.total), 1e-9), [props.series]);

  if (props.series.length === 0) {
    return null;
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-card">
      <SubsectionTitle>Invoice totals by month</SubsectionTitle>
      <p className="mt-1 text-xs text-muted-foreground">{props.footnote}</p>
      <div className="mt-4 flex h-36 items-end justify-between gap-2 border-b border-border px-1 pb-1">
        {props.series.map((p) => {
          const h = Math.max(6, Math.round((p.total / max) * BAR_AREA_PX));
          return (
            <div className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1" key={p.monthKey}>
              <div
                className="w-full max-w-[2.75rem] rounded-t-md bg-primary/85 dark:bg-primary/65"
                style={{ height: h }}
              />
              <span className="text-center text-[10px] font-medium text-foreground" title={`${p.total.toFixed(2)} ${p.currency}`}>
                {p.total >= 1000 ? `${(p.total / 1000).toFixed(1)}k` : p.total.toFixed(0)}
              </span>
              <span className="truncate text-center text-[10px] text-muted-foreground">{p.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
