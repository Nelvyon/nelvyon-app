"use client";

import React from "react";

import { AutomationJob } from "@/features/automations/types";

export function JobDetailCard({ job }: { job: AutomationJob }) {
  return (
    <section className="space-y-2 rounded border p-4">
      <h2 className="text-lg font-semibold">
        Job #{job.id} · {job.job_type}
      </h2>
      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">Status</dt>
          <dd>{job.status}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Priority</dt>
          <dd>{job.priority ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Source</dt>
          <dd>{job.source ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Client</dt>
          <dd>{job.client_name ?? job.client_id ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Processing (ms)</dt>
          <dd>{job.processing_time_ms ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Webhook id</dt>
          <dd>{job.webhook_id ?? "—"}</dd>
        </div>
      </dl>
      {job.error_message && (
        <div className="rounded border border-destructive/25 bg-destructive/10 p-2 text-sm text-destructive">
          <p className="font-medium">Error</p>
          <p>{job.error_message}</p>
        </div>
      )}
      {job.output_data && (
        <div className="text-sm">
          <p className="text-muted-foreground">Output (preview)</p>
          <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap rounded bg-muted p-2 text-xs">
            {job.output_data.length > 4000 ? `${job.output_data.slice(0, 4000)}…` : job.output_data}
          </pre>
        </div>
      )}
    </section>
  );
}
