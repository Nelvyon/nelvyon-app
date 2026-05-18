import { describe, expect, it } from "vitest";

import { invoicesToMonthlySpendSeries } from "@/features/billing/invoiceTrend";
import type { InvoiceRow } from "@/features/billing/types";

function inv(partial: Partial<InvoiceRow> & Pick<InvoiceRow, "id" | "date" | "amount">): InvoiceRow {
  return {
    number: "n",
    currency: "EUR",
    status: "paid",
    plan: "p",
    period: "m",
    pdf_url: "/x",
    ...partial,
  };
}

describe("invoicesToMonthlySpendSeries", () => {
  it("groups amounts by calendar month from invoice dates only", () => {
    const rows: InvoiceRow[] = [
      inv({ id: "1", date: "2024-01-10", amount: 10 }),
      inv({ id: "2", date: "2024-01-20", amount: 15 }),
      inv({ id: "3", date: "2024-02-05", amount: 40 }),
    ];
    const s = invoicesToMonthlySpendSeries(rows);
    expect(s.map((x) => x.monthKey)).toEqual(["2024-01", "2024-02"]);
    expect(s[0]?.total).toBe(25);
    expect(s[1]?.total).toBe(40);
  });
});
