import { rowsToCsv } from "@/core/utils/csv";

import type { InvoiceRow } from "@/features/billing/types";

/** Inclusive YYYY-MM-DD bounds on `InvoiceRow.date` prefix. */
export function filterInvoicesByIsoDateRange(
  invoices: ReadonlyArray<InvoiceRow>,
  from?: string,
  to?: string,
): InvoiceRow[] {
  if (!from?.trim() && !to?.trim()) return [...invoices];
  const f = from?.trim() || "0000-01-01";
  const t = to?.trim() || "9999-12-31";
  return invoices.filter((inv) => {
    const d = inv.date.slice(0, 10);
    if (d.length < 10) return false;
    return d >= f && d <= t;
  });
}

export function buildInvoicesCsv(invoices: ReadonlyArray<InvoiceRow>): string {
  const header = ["id", "number", "date", "amount", "currency", "status", "plan", "period", "pdf_url"];
  const rows: (string | number)[][] = [header];
  for (const inv of invoices) {
    rows.push([
      inv.id,
      inv.number,
      inv.date,
      inv.amount,
      inv.currency,
      inv.status,
      inv.plan,
      inv.period,
      inv.pdf_url,
    ]);
  }
  return rowsToCsv(rows);
}
