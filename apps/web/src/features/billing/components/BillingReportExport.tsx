"use client";

import React from "react";

import { Button } from "@/core/ui/button";
import { SectionLead, SectionTitle } from "@/core/ui/typography";
import { downloadCsvFile } from "@/core/utils/csv";
import { buildBillingWorkspaceCsv } from "@/features/billing/analytics";
import type { BillingInvoices, BillingSummary, BillingUsage } from "@/features/billing/types";

export function BillingReportExport(props: {
  summary: BillingSummary;
  usage: BillingUsage;
  invoices: BillingInvoices;
}) {
  const onExport = () => {
    const csv = buildBillingWorkspaceCsv(props.summary, props.usage, props.invoices);
    downloadCsvFile(`nelvyon-billing-snapshot-${new Date().toISOString().slice(0, 10)}.csv`, csv);
  };

  return (
    <section className="rounded-lg border border-dashed border-border bg-muted/50 p-4 shadow-card">
      <SectionTitle>Reporting (export)</SectionTitle>
      <SectionLead className="mt-1 max-w-2xl leading-relaxed">
        Downloads a CSV built from the same summary, usage, and invoice payloads already shown on this page. No extra
        analytics API is called.
      </SectionLead>
      <div className="mt-3">
        <Button onClick={onExport} type="button" variant="secondary">
          Download billing CSV
        </Button>
      </div>
    </section>
  );
}
