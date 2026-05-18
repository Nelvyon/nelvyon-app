import type { InvoiceRow } from "@/features/billing/types";

export interface MonthlySpendPoint {
  /** ISO month key YYYY-MM */
  monthKey: string;
  /** Human label e.g. Jan 2024 */
  label: string;
  total: number;
  currency: string;
}

const monthFormatter = new Intl.DateTimeFormat("en", { month: "short", year: "numeric" });

function parseInvoiceMonthKey(dateStr: string): string | null {
  const d = dateStr.slice(0, 10);
  if (d.length < 7 || !/^\d{4}-\d{2}/.test(d)) return null;
  return d.slice(0, 7);
}

/**
 * Sums invoice amounts by calendar month using each row's `date` field only.
 * No extra API: caller must pass the same invoice list already loaded from GET /billing/invoices.
 */
export function invoicesToMonthlySpendSeries(invoices: ReadonlyArray<InvoiceRow>): MonthlySpendPoint[] {
  const byMonth = new Map<string, { total: number; currency: string }>();
  for (const inv of invoices) {
    const key = parseInvoiceMonthKey(inv.date);
    if (!key) continue;
    const cur = byMonth.get(key) ?? { total: 0, currency: inv.currency };
    cur.total += inv.amount;
    cur.currency = inv.currency || cur.currency;
    byMonth.set(key, cur);
  }
  const keys = [...byMonth.keys()].sort();
  return keys.map((monthKey) => {
    const { total, currency } = byMonth.get(monthKey)!;
    const [y, m] = monthKey.split("-").map(Number);
    const label = monthFormatter.format(new Date(Date.UTC(y, m - 1, 1)));
    return { monthKey, label, total, currency };
  });
}
