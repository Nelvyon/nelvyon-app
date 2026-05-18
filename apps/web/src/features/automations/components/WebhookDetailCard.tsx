"use client";

import React from "react";

import { AutomationWebhook } from "@/features/automations/types";

export function WebhookDetailCard({ webhook }: { webhook: AutomationWebhook }) {
  return (
    <section className="space-y-2 rounded border p-4">
      <h2 className="text-lg font-semibold">{webhook.name}</h2>
      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        <div className="sm:col-span-2">
          <dt className="text-muted-foreground">Webhook key</dt>
          <dd className="font-mono text-xs break-all">{webhook.webhook_key}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Active</dt>
          <dd>{webhook.is_active === false ? "no" : "yes"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Job type</dt>
          <dd>{webhook.job_type ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Total calls</dt>
          <dd>{webhook.total_calls ?? 0}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Last called</dt>
          <dd>{webhook.last_called_at ?? "—"}</dd>
        </div>
      </dl>
      <p className="text-xs text-muted-foreground">
        External trigger uses{" "}
        <code className="rounded bg-muted px-1">POST /api/v1/automation/webhook/trigger/{"{key}"}</code>{" "}
        (no JWT); this UI only lists workspace webhooks.
      </p>
    </section>
  );
}
