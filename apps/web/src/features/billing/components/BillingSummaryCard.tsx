"use client";

import React from "react";

import { SectionTitle } from "@/core/ui/typography";
import { BillingSummary } from "@/features/billing/types";

export function BillingSummaryCard({ summary }: { summary: BillingSummary }) {
  const currency = (summary.currency || "").toUpperCase();
  return (
    <section className="rounded-lg border border-border bg-card p-4 shadow-card">
      <SectionTitle className="text-lg font-semibold tracking-tight">Current plan</SectionTitle>
      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">Plan</dt>
          <dd className="font-medium text-foreground">
            {summary.plan_label} <span className="text-muted-foreground">({summary.plan_id})</span>
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Billing cycle</dt>
          <dd className="text-foreground">{summary.billing_cycle}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Next charge</dt>
          <dd>{summary.next_billing_date ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Monthly (last active sub.)</dt>
          <dd className="text-foreground">
            {summary.monthly_cost.toFixed(2)} {currency}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Paid YTD</dt>
          <dd className="text-foreground">
            {summary.total_paid_ytd.toFixed(2)} {currency}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Usage alerts</dt>
          <dd className="text-foreground">{summary.usage_alerts}</dd>
        </div>
      </dl>
    </section>
  );
}
