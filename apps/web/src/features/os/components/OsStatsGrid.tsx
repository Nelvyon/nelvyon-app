"use client";

import React from "react";

import { AutomationStats } from "@/features/os/types";

export function OsStatsGrid({ stats }: { stats: AutomationStats }) {
  const cells = [
    { label: "Total jobs", value: stats.total_jobs },
    { label: "Completed", value: stats.completed },
    { label: "Pending", value: stats.pending },
    { label: "Failed", value: stats.failed },
    { label: "Success rate", value: `${stats.success_rate}%` },
    { label: "Avg processing (ms)", value: stats.average_processing_ms },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {cells.map((c) => (
        <div className="rounded-lg border border-border bg-card p-3 shadow-card" key={c.label}>
          <p className="text-xs text-muted-foreground">{c.label}</p>
          <p className="text-lg font-semibold text-foreground">{c.value}</p>
        </div>
      ))}
    </div>
  );
}
