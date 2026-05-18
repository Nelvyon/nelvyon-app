"use client";

import React from "react";

import { deriveOsHealthLevel } from "@/features/os/schema";

interface OsHealthBannerProps {
  failedJobs: number;
  pendingJobs: number;
  billingUsageAlerts: number;
}

export function OsHealthBanner({ failedJobs, pendingJobs, billingUsageAlerts }: OsHealthBannerProps) {
  const level = deriveOsHealthLevel({
    failed: failedJobs,
    pending: pendingJobs,
    usageAlerts: billingUsageAlerts,
  });

  if (level === "ok") {
    return (
      <div className="rounded-lg border border-success/35 bg-success/10 p-4 text-sm text-success-foreground shadow-card">
        <p className="font-medium">Workspace status</p>
        <p className="mt-1">No critical automation failures and no billing usage warnings from the latest snapshot.</p>
      </div>
    );
  }

  if (level === "attention") {
    const parts: string[] = [];
    if (billingUsageAlerts > 0) {
      parts.push(`${billingUsageAlerts} billing usage alert(s) on record.`);
    }
    if (pendingJobs > 5) {
      parts.push(`High pending automation backlog (${pendingJobs} jobs).`);
    }
    return (
      <div className="rounded border border-warning/35 bg-warning/10 p-4 text-sm text-warning-foreground">
        <p className="font-medium">Attention</p>
        <ul className="mt-2 list-inside list-disc space-y-1">
          {parts.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-destructive/25 bg-destructive/10 p-4 text-sm text-destructive shadow-card">
      <p className="font-medium">Incidents</p>
      <p className="mt-1">There are failed automation jobs in this workspace. Review the recent activity list and retry from Automations.</p>
    </div>
  );
}
