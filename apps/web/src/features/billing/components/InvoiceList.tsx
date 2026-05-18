"use client";

import React from "react";

import { Badge, toneFromInvoiceStatus } from "@/core/ui/Badge";
import { EmptyState } from "@/core/ui/EmptyState";
import { InvoiceRow } from "@/features/billing/types";

export function InvoiceList({ invoices, currency }: { invoices: InvoiceRow[]; currency: string }) {
  const defaultCurrency = (currency || "").toUpperCase();
  if (invoices.length === 0) {
    return (
      <EmptyState
        description="NELVYON will list paid subscription activity here as your workspace billing history grows. If you recently upgraded, refresh after checkout completes."
        title="No invoices on file"
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-card">
      <table className="w-full min-w-[480px] text-left text-sm">
        <thead className="border-b border-border bg-muted">
          <tr>
            <th className="p-2 font-medium text-foreground">Number</th>
            <th className="p-2 font-medium text-foreground">Date</th>
            <th className="p-2 font-medium text-foreground">Plan</th>
            <th className="p-2 font-medium text-foreground">Amount</th>
            <th className="p-2 font-medium text-foreground">Status</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((inv) => (
            <tr className="border-b border-border last:border-0" key={inv.id}>
              <td className="p-2 font-mono text-xs text-foreground">{inv.number}</td>
              <td className="p-2 text-foreground">{inv.date}</td>
              <td className="p-2 text-foreground">{inv.plan}</td>
              <td className="p-2 text-foreground">
                {inv.amount.toFixed(2)} {(inv.currency || defaultCurrency).toUpperCase()}
              </td>
              <td className="p-2">
                <Badge className="capitalize" tone={toneFromInvoiceStatus(inv.status)}>
                  {inv.status}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
