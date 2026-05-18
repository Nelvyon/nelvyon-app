"use client";

import React from "react";

import { SectionLead, SectionTitle } from "@/core/ui/typography";
import type { WebhookRollup } from "@/features/os/analytics";
import type { AutomationStats } from "@/features/os/types";

export function OsAnalyticsStrip(props: {
  stats: AutomationStats;
  webhooks: WebhookRollup;
  retriesInRecentSample: number;
  recentSampleSize: number;
}) {
  const { stats, webhooks, retriesInRecentSample, recentSampleSize } = props;

  return (
    <section className="rounded-lg border border-border bg-card p-4 shadow-card">
      <SectionTitle>Operations snapshot</SectionTitle>
      <SectionLead className="mt-1 max-w-3xl leading-relaxed">
        Figures come from live automation stats and short API samples. They are not a full historical warehouse.
      </SectionLead>
      <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded border border-border bg-muted/80 p-3">
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Jobs recorded</dt>
          <dd className="mt-1 text-2xl font-semibold text-foreground">{stats.total_jobs}</dd>
          <dd className="mt-1 text-xs text-muted-foreground">Completed {stats.completed}</dd>
        </div>
        <div className="rounded border border-border bg-muted/80 p-3">
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Failed</dt>
          <dd className="mt-1 text-2xl font-semibold text-warning-foreground">{stats.failed}</dd>
          <dd className="mt-1 text-xs text-muted-foreground">Pending / running {stats.pending}</dd>
        </div>
        <div className="rounded border border-border bg-muted/80 p-3">
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Retries in job sample</dt>
          <dd className="mt-1 text-2xl font-semibold text-foreground">{retriesInRecentSample}</dd>
          <dd className="mt-1 text-xs text-muted-foreground">
            From last {recentSampleSize} job row(s) loaded for this screen — not total retries in history.
          </dd>
        </div>
        <div className="rounded border border-border bg-muted/80 p-3">
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Webhooks</dt>
          <dd className="mt-1 text-2xl font-semibold text-foreground">
            {webhooks.active}/{webhooks.total}
          </dd>
          <dd className="mt-1 text-xs text-muted-foreground">Active vs configured (inactive: {webhooks.inactive})</dd>
        </div>
      </dl>
    </section>
  );
}
