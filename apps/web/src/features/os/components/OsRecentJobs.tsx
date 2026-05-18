"use client";

import React from "react";
import Link from "next/link";

import { EmptyState } from "@/core/ui/EmptyState";
import { AutomationJobSummary } from "@/features/os/types";

export function OsRecentJobs({ items }: { items: AutomationJobSummary[] }) {
  if (items.length === 0) {
    return (
      <EmptyState
        description="Why: the recent-jobs sample for this workspace is empty (no runs yet, or filters upstream returned zero rows). Next: trigger a workflow or import, then refresh Operations; open Automations → Jobs for the full queue."
        title="No recent automation jobs in this sample"
      />
    );
  }

  return (
    <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card shadow-card">
      {items.map((job) => (
        <li className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-sm" key={job.id}>
          <div>
            <p className="font-medium text-foreground">
              Job #{job.id} · {job.job_type}
            </p>
            <p className="text-xs text-muted-foreground">
              {job.status}
              {job.client_name ? ` · ${job.client_name}` : ""}
            </p>
          </div>
          <Link className="text-xs text-link transition-colors hover:text-link-hover hover:underline" href={`/automations/jobs/${job.id}`}>
            Open
          </Link>
        </li>
      ))}
    </ul>
  );
}
