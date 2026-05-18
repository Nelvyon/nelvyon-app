import { apiClient } from "@/core/api";
import type { AutomationWebhookListResponse } from "@/features/automations/types";
import { AutomationJobList, AutomationStats, OS_JOB_PREVIEW_LIMIT } from "@/features/os/types";

const WEBHOOKS_BASE = "/api/v1/entities/automation_webhooks";

export type ListJobsPageParams = {
  skip: number;
  limit: number;
  status?: string;
  jobType?: string;
};

function jobsQueryString(params: ListJobsPageParams): string {
  const sp = new URLSearchParams();
  sp.set("skip", String(params.skip));
  sp.set("limit", String(params.limit));
  if (params.status) sp.set("status", params.status);
  if (params.jobType) sp.set("job_type", params.jobType);
  return sp.toString();
}

export const osApi = {
  stats: () => apiClient.get<AutomationStats>("/api/v1/automation/stats", { tenantScoped: true }),
  recentJobs: () =>
    apiClient.get<AutomationJobList>(`/api/v1/automation/jobs?skip=0&limit=${OS_JOB_PREVIEW_LIMIT}`, {
      tenantScoped: true,
    }),
  /** Paged list from automation service (same route OS uses; supports skip/limit/status/job_type). */
  listJobsPage: (params: ListJobsPageParams) =>
    apiClient.get<AutomationJobList>(`/api/v1/automation/jobs?${jobsQueryString(params)}`, { tenantScoped: true }),
  /** Recent failed jobs from the automation service (same source as stats.failed, with row context). */
  failedJobsSample: () =>
    apiClient.get<AutomationJobList>(`/api/v1/automation/jobs?skip=0&limit=20&status=failed`, {
      tenantScoped: true,
    }),
  webhooksList: () =>
    apiClient.get<AutomationWebhookListResponse>(WEBHOOKS_BASE, { tenantScoped: true }),
};
