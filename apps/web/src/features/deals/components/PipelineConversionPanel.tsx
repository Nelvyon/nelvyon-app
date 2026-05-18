"use client";

import React from "react";

import { ApiError } from "@/core/api/types";
import { PipelineStageMetric, PipelineSummary } from "@/features/deals/types";

function getStages(summary?: PipelineSummary): PipelineStageMetric[] {
  if (!summary) return [];
  return summary.by_stage ?? summary.items ?? summary.stages ?? [];
}

export function PipelineConversionPanel({
  summary,
  isLoading,
  error,
}: {
  summary?: PipelineSummary;
  isLoading?: boolean;
  error?: unknown;
}) {
  const stages = getStages(summary);
  const total = stages.reduce((acc, row) => acc + (row.count ?? 0), 0);
  const open = stages.filter((row) => (row.stage ?? "").toLowerCase() !== "won").reduce((acc, row) => acc + (row.count ?? 0), 0);
  const won = stages.filter((row) => (row.stage ?? "").toLowerCase() === "won").reduce((acc, row) => acc + (row.count ?? 0), 0);
  const winRate = open + won > 0 ? (won / (open + won)) * 100 : 0;

  return (
    <section className="space-y-3 rounded-lg border border-border bg-card p-4 shadow-card">
      <h2 className="text-base font-medium text-foreground">Pipeline conversion (workspace)</h2>
      {!isLoading && !error ? (
        <p className="text-sm text-muted-foreground">
          Total deals tracked: <strong>{total}</strong> · Won: <strong>{won}</strong> · Win rate snapshot:{" "}
          <strong>{winRate.toFixed(1)}%</strong>
        </p>
      ) : null}
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading pipeline analytics for this workspace…</p>
      ) : null}
      {error ? (
        <div className="space-y-1 text-sm">
          <p className="font-medium text-destructive">Could not load pipeline summary.</p>
          <p className="text-muted-foreground">
            {error instanceof ApiError && error.status === 403
              ? "Cause: your role cannot read CRM analytics for the current workspace. Next: switch workspace in the header or ask an admin for CRM view access."
              : "Cause: the analytics request failed or timed out. Next: refresh the page; if it persists, confirm network/VPN and try again."}
          </p>
        </div>
      ) : null}
      {!isLoading && !error && stages.length === 0 ? (
        <div className="space-y-1 text-sm text-muted-foreground">
          <p>No stage breakdown is available yet.</p>
          <p>
            Why: the workspace may have no deals, or the API returned an empty summary. Next: add or import deals under
            Revenue → Deals, then reload; operators can also confirm backend <code className="text-xs">/crm/analytics/pipeline</code>{" "}
            for this tenant.
          </p>
        </div>
      ) : null}
      {!isLoading && !error && stages.length > 0 ? (
        <ul className="space-y-1 text-sm">
          {stages.map((row) => (
            <li className="flex items-center justify-between gap-2" key={`${row.stage}-${row.count}`}>
              <span className="text-foreground">{row.stage ?? "unknown"}</span>
              <span className="text-muted-foreground">
                {row.count ?? 0} deal(s) · {row.value ?? 0} value
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
