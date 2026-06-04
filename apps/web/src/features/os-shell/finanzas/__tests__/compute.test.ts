import { describe, expect, it } from "vitest";

import {
  countActiveContracts,
  countPendingInvoices,
  parseAmount,
  sumPaidInvoicesInPeriod,
} from "../compute";

describe("os finanzas compute", () => {
  it("parseAmount handles numeric strings", () => {
    expect(parseAmount("1200")).toBe(1200);
  });

  it("sumPaidInvoicesInPeriod returns null when no paid in month", () => {
    const now = new Date();
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const r = sumPaidInvoicesInPeriod(
      [{ id: 1, status: "paid", total: 100, created_at: `${ym}-01-01` }],
      "month",
    );
    expect(r).toBe(100);
  });

  it("countPendingInvoices", () => {
    expect(
      countPendingInvoices([
        { id: 1, status: "sent", total: 50 },
        { id: 2, status: "paid", total: 100 },
      ]),
    ).toEqual({ count: 1, amount: 50 });
  });

  it("countActiveContracts", () => {
    expect(
      countActiveContracts([{ status: "active" }, { status: "draft" }]),
    ).toBe(1);
  });
});
