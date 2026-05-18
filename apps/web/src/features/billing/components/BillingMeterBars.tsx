"use client";

import React from "react";

import type { UsageMeter } from "@/features/billing/types";

function barColor(percentage: number): string {
  if (percentage >= 90) return "bg-warning";
  if (percentage >= 75) return "bg-warning/70";
  return "bg-primary/50";
}

export function BillingMeterBars({ meters }: { meters: UsageMeter[] }) {
  const finite = meters.filter((m) => m.limit < 1e8);
  if (finite.length === 0) {
    return <p className="text-sm text-muted-foreground">No finite limits to visualize; your plan may use open-ended quotas.</p>;
  }

  return (
    <ul className="space-y-4">
      {finite.map((m) => (
        <li className="space-y-1" key={m.id}>
          <div className="flex flex-wrap justify-between gap-2 text-sm">
            <span className="font-medium text-foreground">{m.label}</span>
            <span className="text-muted-foreground">
              {m.current} / {m.limit} {m.unit} ({m.percentage}%)
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full transition-all ${barColor(m.percentage)}`}
              style={{ width: `${Math.min(100, m.percentage)}%` }}
            />
          </div>
          <p className="text-xs capitalize text-muted-foreground">Status: {m.status}</p>
        </li>
      ))}
    </ul>
  );
}
