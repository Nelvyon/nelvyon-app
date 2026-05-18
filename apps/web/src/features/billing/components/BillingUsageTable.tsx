"use client";

import React from "react";

import { Badge, toneFromMeterStatus } from "@/core/ui/Badge";
import { UsageMeter } from "@/features/billing/types";

export function BillingUsageTable({ meters }: { meters: UsageMeter[] }) {
  if (meters.length === 0) {
    return <p className="text-sm text-muted-foreground">No usage meters returned.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-card">
      <table className="w-full min-w-[520px] text-left text-sm">
        <thead className="border-b border-border bg-muted">
          <tr>
            <th className="p-2 font-medium text-foreground">Metric</th>
            <th className="p-2 font-medium text-foreground">Current</th>
            <th className="p-2 font-medium text-foreground">Limit</th>
            <th className="p-2 font-medium text-foreground">%</th>
            <th className="p-2 font-medium text-foreground">Status</th>
          </tr>
        </thead>
        <tbody>
          {meters.map((m) => (
            <tr className="border-b border-border last:border-0" key={m.id}>
              <td className="p-2 text-foreground">{m.label}</td>
              <td className="p-2 text-foreground">
                {m.current} {m.unit}
              </td>
              <td className="p-2 text-foreground">
                {m.limit >= 1e8 ? "∞" : `${m.limit} ${m.unit}`}
              </td>
              <td className="p-2 text-foreground">{m.limit >= 1e8 ? "—" : `${m.percentage}%`}</td>
              <td className="p-2">
                <Badge className="capitalize" tone={toneFromMeterStatus(m.status)}>
                  {m.status}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
