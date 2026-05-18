import { rowsToCsv } from "@/core/utils/csv";

import type { BillingInvoices, BillingSummary, BillingUsage, InvoiceRow, UsageMeter } from "@/features/billing/types";

export function sortMetersByRisk(meters: ReadonlyArray<UsageMeter>): UsageMeter[] {
  return [...meters].sort((a, b) => b.percentage - a.percentage);
}

/** Sum of amounts for the N most recent invoices by `date` (ISO sort). */
export function recentInvoicesTotal(invoices: ReadonlyArray<InvoiceRow>, max = 5): number {
  if (invoices.length === 0) return 0;
  const sorted = [...invoices].sort((a, b) => b.date.localeCompare(a.date));
  return sorted.slice(0, max).reduce((sum, inv) => sum + inv.amount, 0);
}

export function consumptionRiskLabel(meters: ReadonlyArray<UsageMeter>, usageAlerts: number): "high" | "watch" | "ok" {
  const hot = meters.some((m) => m.limit < 1e8 && m.percentage >= 90);
  if (hot || usageAlerts > 0) return "high";
  const warm = meters.some((m) => m.limit < 1e8 && m.percentage >= 75);
  if (warm) return "watch";
  return "ok";
}

/**
 * Single CSV snapshot: summary row, meters, invoices.
 * Suitable for a minimal workspace billing export from data already loaded in the UI.
 */
export function buildBillingWorkspaceCsv(
  summary: BillingSummary,
  usage: BillingUsage,
  invoices: BillingInvoices,
): string {
  const sections: (string | number | null | undefined)[][] = [];
  sections.push(["section", "key", "value"]);
  sections.push(["summary", "plan_id", summary.plan_id]);
  sections.push(["summary", "plan_label", summary.plan_label]);
  sections.push(["summary", "billing_cycle", summary.billing_cycle]);
  sections.push(["summary", "next_billing_date", summary.next_billing_date ?? ""]);
  sections.push(["summary", "monthly_cost", summary.monthly_cost]);
  sections.push(["summary", "currency", summary.currency]);
  sections.push(["summary", "usage_alerts", summary.usage_alerts]);
  sections.push(["summary", "meters_at_risk", summary.meters_at_risk.join("; ")]);
  sections.push(["summary", "total_paid_ytd", summary.total_paid_ytd]);
  sections.push([]);
  sections.push(["meter", "id", "label", "current", "limit", "unit", "percentage", "status"]);
  for (const m of usage.meters) {
    sections.push(["meter", m.id, m.label, m.current, m.limit, m.unit, m.percentage, m.status]);
  }
  sections.push([]);
  sections.push(["invoice", "id", "number", "date", "amount", "currency", "status", "plan", "period"]);
  for (const inv of invoices.invoices) {
    sections.push([
      "invoice",
      inv.id,
      inv.number,
      inv.date,
      inv.amount,
      inv.currency,
      inv.status,
      inv.plan,
      inv.period,
    ]);
  }
  return rowsToCsv(sections);
}
