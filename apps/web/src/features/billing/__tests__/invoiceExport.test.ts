import { describe, expect, it } from "vitest";

import { buildInvoicesCsv, filterInvoicesByIsoDateRange } from "@/features/billing/invoiceExport";
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

describe("filterInvoicesByIsoDateRange", () => {
  it("keeps inclusive bounds on invoice date", () => {
    const rows = [inv({ id: "1", date: "2024-01-01", amount: 1 }), inv({ id: "2", date: "2024-02-01", amount: 2 })];
    expect(filterInvoicesByIsoDateRange(rows, "2024-01-01", "2024-01-31")).toHaveLength(1);
  });
});

describe("buildInvoicesCsv", () => {
  it("includes pdf_url column for downstream PDF links", () => {
    const csv = buildInvoicesCsv([inv({ id: "a", date: "2024-01-01", amount: 9 })]);
    expect(csv.split("\n")[0]).toContain("pdf_url");
    expect(csv).toContain("a");
  });
});
