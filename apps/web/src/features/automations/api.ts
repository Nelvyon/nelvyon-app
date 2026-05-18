import { apiClient } from "@/core/api";
import {
  AutomationJob,
  AutomationJobListResponse,
  AutomationWebhook,
  AutomationWebhookListResponse,
  AutomationWebhookUpdateInput,
  RetryJobResponse,
} from "@/features/automations/types";

const JOBS_BASE = "/api/v1/entities/automation_jobs";
const WEBHOOKS_BASE = "/api/v1/entities/automation_webhooks";

export const automationsJobsApi = {
  list: () => apiClient.get<AutomationJobListResponse>(JOBS_BASE, { tenantScoped: true }),
  getById: (id: number) => apiClient.get<AutomationJob>(`${JOBS_BASE}/${id}`, { tenantScoped: true }),
};

export const automationsWebhooksApi = {
  list: () => apiClient.get<AutomationWebhookListResponse>(WEBHOOKS_BASE, { tenantScoped: true }),
  getById: (id: number) =>
    apiClient.get<AutomationWebhook>(`${WEBHOOKS_BASE}/${id}`, { tenantScoped: true }),
  update: (id: number, payload: AutomationWebhookUpdateInput) =>
    apiClient.put<AutomationWebhook, AutomationWebhookUpdateInput>(`${WEBHOOKS_BASE}/${id}`, {
      tenantScoped: true,
      body: payload,
    }),
};

export const automationsActionsApi = {
  retryJob: (jobId: number) =>
    apiClient.post<RetryJobResponse, Record<string, never>>(`/api/v1/automation/retry/${jobId}`, {
      tenantScoped: true,
      body: {},
    }),
};
