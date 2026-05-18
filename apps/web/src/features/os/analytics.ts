import { rowsToCsv } from "@/core/utils/csv";

import type { AutomationJobSummary } from "@/features/os/types";

export interface WebhookRollup {
  total: number;
  active: number;
  inactive: number;
}

export function rollupWebhooks(
  items: ReadonlyArray<{ is_active?: boolean | null }>,
): WebhookRollup {
  const total = items.length;
  let active = 0;
  for (const w of items) {
    if (w.is_active !== false) active += 1;
  }
  return { total, active, inactive: total - active };
}

/** Retries seen in the provided job rows only (sample; not a full-workspace history). */
export function countRetriesInSample(jobs: ReadonlyArray<AutomationJobSummary>): number {
  return jobs.filter((j) => (j.source ?? "").toLowerCase().includes("retry")).length;
}

export interface OsPlaybookItem {
  title: string;
  detail: string;
  href: string;
  cta: string;
}

export function buildOsPlaybook(input: {
  statsFailed: number;
  statsPending: number;
  webhookInactive: number;
  metersAtRisk: string[];
}): OsPlaybookItem[] {
  const items: OsPlaybookItem[] = [];

  if (input.statsFailed > 0) {
    items.push({
      title: "Review failed automation jobs",
      detail: `${input.statsFailed} failed job(s) are recorded for this workspace. Open failed runs, read errors, and retry when safe.`,
      href: "/automations/jobs",
      cta: "Open Automations",
    });
  }

  if (input.statsPending > 8) {
    items.push({
      title: "Reduce automation backlog",
      detail: `${input.statsPending} jobs are pending or processing. Check Automations for stuck work or capacity limits.`,
      href: "/automations/jobs",
      cta: "Inspect queue",
    });
  }

  if (input.webhookInactive > 0) {
    items.push({
      title: "Re-enable or replace inactive webhooks",
      detail: `${input.webhookInactive} webhook(s) are inactive. Inbound triggers will not run until they are turned back on.`,
      href: "/automations/webhooks",
      cta: "Manage webhooks",
    });
  }

  if (input.metersAtRisk.length > 0) {
    items.push({
      title: "Resolve billing usage pressure",
      detail: `Meters flagged: ${input.metersAtRisk.join(", ")}. Review Billing to align plan or reduce usage; some meters are enforced quotas while others are informational.`,
      href: "/billing",
      cta: "Open Billing",
    });
  }

  if (items.length === 0) {
    items.push({
      title: "Keep monitoring Operations",
      detail: "No critical playbook items right now. Periodically review jobs, webhooks, and billing as the workspace grows.",
      href: "/os",
      cta: "Refresh view",
    });
  }

  return items.slice(0, 5);
}

/** Dedupe by job id; failed sample rows win over generic recent rows for the same id. */
export function mergeJobExportRows(
  recent: ReadonlyArray<AutomationJobSummary>,
  failed: ReadonlyArray<AutomationJobSummary>,
): AutomationJobSummary[] {
  const map = new Map<number, AutomationJobSummary>();
  for (const j of recent) map.set(j.id, j);
  for (const j of failed) map.set(j.id, j);
  return [...map.values()].sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));
}

export function buildOsJobsCsv(jobs: ReadonlyArray<AutomationJobSummary>): string {
  const header = ["id", "job_type", "status", "source", "client_name", "created_at", "error_message"];
  const rows: (string | number | null | undefined)[][] = [header];
  for (const j of jobs) {
    rows.push([
      j.id,
      j.job_type,
      j.status,
      j.source ?? "",
      j.client_name ?? "",
      j.created_at ?? "",
      j.error_message ?? "",
    ]);
  }
  return rowsToCsv(rows);
}
