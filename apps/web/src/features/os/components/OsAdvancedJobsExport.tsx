"use client";

import React, { useState } from "react";

import { Button } from "@/core/ui/button";
import { SectionLead, SectionTitle } from "@/core/ui/typography";
import { downloadCsvFile } from "@/core/utils/csv";
import { buildOsJobsCsv } from "@/features/os/analytics";
import { osApi } from "@/features/os/api";
import {
  collectAutomationJobsPages,
  filterJobsByCreatedDateRange,
  MAX_EXPORT_JOB_ROWS,
} from "@/features/os/exportJobsPaged";

export function OsAdvancedJobsExport() {
  const [status, setStatus] = useState("");
  const [jobType, setJobType] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [pageSize, setPageSize] = useState(100);
  const [busy, setBusy] = useState(false);
  const [lastCount, setLastCount] = useState<number | null>(null);

  const onExport = async () => {
    setBusy(true);
    setLastCount(null);
    try {
      const size = Math.min(200, Math.max(20, Math.floor(pageSize) || 100));
      const rows = await collectAutomationJobsPages(
        (p) => osApi.listJobsPage(p),
        {
          pageSize: size,
          maxRows: MAX_EXPORT_JOB_ROWS,
          status: status.trim() || undefined,
          jobType: jobType.trim() || undefined,
        },
      );
      const filtered = filterJobsByCreatedDateRange(rows, dateFrom.trim() || undefined, dateTo.trim() || undefined);
      setLastCount(filtered.length);
      const csv = buildOsJobsCsv(filtered);
      downloadCsvFile(`nelvyon-os-jobs-export-${new Date().toISOString().slice(0, 10)}.csv`, csv);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-lg border border-border bg-card p-4 shadow-card">
      <SectionTitle>Advanced export (jobs)</SectionTitle>
      <SectionLead className="mt-1 max-w-3xl leading-relaxed">
        Fetches pages from <code className="rounded bg-muted px-1 text-xs">GET /api/v1/automation/jobs</code> with{" "}
        <code className="rounded bg-muted px-1 text-xs">skip</code>/<code className="rounded bg-muted px-1 text-xs">limit</code>{" "}
        until the server reports the end or {MAX_EXPORT_JOB_ROWS.toLocaleString()} rows are reached. Date range filters
        rows <strong>after download</strong> using each job&apos;s <code className="rounded bg-muted px-1 text-xs">created_at</code>{" "}
        day — the API does not accept date query params today.
      </SectionLead>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Status (optional)
          <input
            className="rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground"
            onChange={(e) => setStatus(e.target.value)}
            placeholder="e.g. failed"
            value={status}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Job type (optional)
          <input
            className="rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground"
            onChange={(e) => setJobType(e.target.value)}
            placeholder="exact match"
            value={jobType}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Page size (20–200)
          <input
            className="rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground"
            inputMode="numeric"
            onChange={(e) => setPageSize(Number(e.target.value))}
            type="number"
            value={pageSize}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Created from (YYYY-MM-DD)
          <input
            className="rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground"
            onChange={(e) => setDateFrom(e.target.value)}
            placeholder="optional"
            type="date"
            value={dateFrom}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Created to (YYYY-MM-DD)
          <input
            className="rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground"
            onChange={(e) => setDateTo(e.target.value)}
            placeholder="optional"
            type="date"
            value={dateTo}
          />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button disabled={busy} onClick={onExport} type="button" variant="secondary">
          {busy ? "Fetching pages…" : "Download CSV (paged)"}
        </Button>
        {lastCount !== null ? (
          <span className="text-xs text-muted-foreground">Last file: {lastCount} row(s) after date filter.</span>
        ) : null}
      </div>
    </section>
  );
}
