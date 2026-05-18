"use client";

import React from "react";
import Link from "next/link";

import { Button } from "@/core/ui/button";
import { SectionLead, SectionTitle } from "@/core/ui/typography";
import { downloadCsvFile } from "@/core/utils/csv";
import { buildOsJobsCsv, mergeJobExportRows } from "@/features/os/analytics";
import type { AutomationJobSummary } from "@/features/os/types";

export function OsJobsReportBlock(props: {
  recent: AutomationJobSummary[];
  failedSample: AutomationJobSummary[];
}) {
  const merged = mergeJobExportRows(props.recent, props.failedSample);
  const failedPreview = props.failedSample.slice(0, 5);

  const onExport = () => {
    const csv = buildOsJobsCsv(merged);
    downloadCsvFile(`nelvyon-os-jobs-${new Date().toISOString().slice(0, 10)}.csv`, csv);
  };

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <SectionTitle>Reporting (jobs)</SectionTitle>
          <SectionLead className="mt-1 max-w-2xl leading-relaxed">
            Export merges the recent job preview and the failed-job sample already loaded in this page. It does not
            query the full job history.
          </SectionLead>
        </div>
        <Button disabled={merged.length === 0} onClick={onExport} type="button" variant="secondary">
          Download CSV
        </Button>
      </div>

      {failedPreview.length > 0 && (
        <div className="rounded-lg border border-warning/35 bg-warning/10 p-4">
          <p className="text-sm font-medium text-warning-foreground">Recent failures (sample)</p>
          <ul className="mt-2 divide-y divide-warning/30">
            {failedPreview.map((job) => (
              <li className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm" key={job.id}>
                <div>
                  <span className="font-medium">#{job.id}</span>
                  <span className="text-muted-foreground"> · {job.job_type}</span>
                  {job.error_message ? (
                    <p className="mt-0.5 text-xs text-warning-foreground line-clamp-2">{job.error_message}</p>
                  ) : null}
                </div>
                <Link className="text-xs text-link hover:text-link-hover hover:underline" href={`/automations/jobs/${job.id}`}>
                  Inspect
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
