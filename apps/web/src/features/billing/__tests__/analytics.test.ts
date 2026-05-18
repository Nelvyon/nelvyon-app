import {
  buildBillingWorkspaceCsv,
  consumptionRiskLabel,
  recentInvoicesTotal,
  sortMetersByRisk,
} from "@/features/billing/analytics";
import type { BillingInvoices, BillingSummary, BillingUsage, InvoiceRow, UsageMeter } from "@/features/billing/types";

function meter(partial: Partial<UsageMeter> & Pick<UsageMeter, "id" | "label">): UsageMeter {
  return {
    current: 0,
    limit: 100,
    unit: "u",
    color: "blue",
    percentage: 0,
    status: "ok",
    ...partial,
  };
}

describe("Billing analytics helpers", () => {
  it("sortMetersByRisk orders by percentage descending", () => {
    const sorted = sortMetersByRisk([
      meter({ id: "a", label: "low", percentage: 40 }),
      meter({ id: "b", label: "high", percentage: 92 }),
    ]);
    expect(sorted[0]?.id).toBe("b");
  });

  it("recentInvoicesTotal sums latest invoices by date", () => {
    const rows: InvoiceRow[] = [
      {
        id: "1",
        number: "A",
        date: "2024-01-01",
        amount: 10,
        currency: "EUR",
        status: "paid",
        plan: "p",
        period: "m",
        pdf_url: "",
      },
      {
        id: "2",
        number: "B",
        date: "2024-03-01",
        amount: 25,
        currency: "EUR",
        status: "paid",
        plan: "p",
        period: "m",
        pdf_url: "",
      },
      {
        id: "3",
        number: "C",
        date: "2024-02-01",
        amount: 5,
        currency: "EUR",
        status: "paid",
        plan: "p",
        period: "m",
        pdf_url: "",
      },
    ];
    expect(recentInvoicesTotal(rows, 2)).toBe(30);
  });

  it("consumptionRiskLabel escalates with alerts or hot meters", () => {
    expect(consumptionRiskLabel([], 1)).toBe("high");
    expect(consumptionRiskLabel([meter({ id: "x", label: "m", percentage: 50, limit: 100 })], 0)).toBe("ok");
    expect(consumptionRiskLabel([meter({ id: "x", label: "m", percentage: 92, limit: 100 })], 0)).toBe("high");
  });

  it("buildBillingWorkspaceCsv includes invoice rows", () => {
    const summary: BillingSummary = {
      plan_id: "starter",
      plan_label: "Starter",
      billing_cycle: "monthly",
      next_billing_date: "2024-04-01",
      monthly_cost: 49,
      usage_alerts: 0,
      meters_at_risk: [],
      total_paid_ytd: 100,
      currency: "EUR",
    };
    const usage: BillingUsage = {
      meters: [meter({ id: "contacts", label: "Contacts", current: 1, limit: 10, percentage: 10 })],
      updated_at: "2024-01-01",
      plan_id: "starter",
      plan_label: "Starter",
    };
    const invoices: BillingInvoices = {
      invoices: [
        {
          id: "inv1",
          number: "100",
          date: "2024-01-15",
          amount: 49,
          currency: "EUR",
          status: "paid",
          plan: "starter",
          period: "Jan",
          pdf_url: "",
        },
      ],
      total_paid: 49,
      currency: "EUR",
    };
    const csv = buildBillingWorkspaceCsv(summary, usage, invoices);
    expect(csv).toContain("invoice");
    expect(csv).toContain("inv1");
    expect(csv).toContain("meter");
    expect(csv).toContain("contacts");
  });
});
