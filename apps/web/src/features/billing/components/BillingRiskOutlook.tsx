"use client";

import React from "react";

import { SectionTitle } from "@/core/ui/typography";
import { consumptionRiskLabel, recentInvoicesTotal, sortMetersByRisk } from "@/features/billing/analytics";
import type { BillingInvoices, BillingSummary, BillingUsage } from "@/features/billing/types";

export function BillingRiskOutlook(props: {
  summary: BillingSummary;
  usage: BillingUsage;
  invoices: BillingInvoices;
}) {
  const { summary, usage, invoices } = props;
  const risk = consumptionRiskLabel(usage.meters, summary.usage_alerts);
  const top = sortMetersByRisk(usage.meters).slice(0, 3);
  const recentSpend = recentInvoicesTotal(invoices.invoices, 5);

  const riskTitle =
    risk === "high"
      ? "Elevated consumption risk"
      : risk === "watch"
        ? "Usage worth watching"
        : "Usage within expected range";

  return (
    <section className="rounded-lg border border-border bg-card p-4 shadow-card">
      <SectionTitle>Business view</SectionTitle>
      <p className="mt-2 text-sm text-foreground/95">{riskTitle}.</p>
      <ul className="mt-3 list-inside list-disc text-sm text-muted-foreground">
        <li>
          Plan <span className="font-medium text-foreground">{summary.plan_label}</span> — next charge{" "}
          {summary.next_billing_date ?? "not scheduled"}.
        </li>
        <li>
          Approx. monthly subscription:{" "}
          <span className="font-medium text-foreground">
            {summary.monthly_cost.toFixed(2)} {summary.currency}
          </span>
          .
        </li>
        <li>
          Last five invoices (by date) total about{" "}
          <span className="font-medium text-foreground">
            {recentSpend.toFixed(2)} {invoices.currency}
          </span>
          . This is not a forecast — only a quick read of recent billed amounts.
        </li>
        {summary.usage_alerts > 0 ? (
          <li className="text-warning-foreground">
            {summary.usage_alerts} usage alert(s) on file — align capacity or upgrade before hard blocks.
          </li>
        ) : null}
      </ul>
      {top.length > 0 && (
        <div className="mt-4 rounded border border-border bg-muted/80 p-3 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">Highest pressure meters</p>
          <ol className="mt-2 list-inside list-decimal space-y-1">
            {top.map((m) => (
              <li key={m.id}>
                {m.label}: {m.percentage}% of limit ({m.current}/{m.limit} {m.unit})
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}
