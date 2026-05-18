"use client";

import React, { useMemo, useState } from "react";

import { Button } from "@/core/ui/button";
import { SectionLead, SectionTitle } from "@/core/ui/typography";
import { downloadCsvFile } from "@/core/utils/csv";
import { buildInvoicesCsv, filterInvoicesByIsoDateRange } from "@/features/billing/invoiceExport";
import type { InvoiceRow } from "@/features/billing/types";

export function BillingAdvancedInvoicesExport({ invoices }: { invoices: InvoiceRow[] }) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const filtered = useMemo(
    () => filterInvoicesByIsoDateRange(invoices, from.trim() || undefined, to.trim() || undefined),
    [invoices, from, to],
  );

  const onExport = () => {
    const csv = buildInvoicesCsv(filtered);
    downloadCsvFile(`nelvyon-billing-invoices-${new Date().toISOString().slice(0, 10)}.csv`, csv);
  };

  return (
    <section className="rounded-lg border border-border bg-card p-4 shadow-card">
      <SectionTitle>Advanced export (invoices)</SectionTitle>
      <SectionLead className="mt-1 max-w-3xl leading-relaxed">
        Source rows are exactly what <code className="rounded bg-muted px-1 text-xs">GET /api/v1/billing/invoices</code>{" "}
        returned (currently up to 50 subscription rows on the server). Date filters apply here before CSV generation —
        they do not call the backend again.
      </SectionLead>
      <div className="mt-4 flex flex-wrap gap-3">
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          From (invoice date)
          <input
            className="rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground"
            onChange={(e) => setFrom(e.target.value)}
            type="date"
            value={from}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          To (invoice date)
          <input
            className="rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground"
            onChange={(e) => setTo(e.target.value)}
            type="date"
            value={to}
          />
        </label>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Button onClick={onExport} type="button" variant="secondary">
          Download invoices CSV
        </Button>
        <span className="text-xs text-muted-foreground">
          {filtered.length} of {invoices.length} loaded row(s) match the range.
        </span>
      </div>
    </section>
  );
}
