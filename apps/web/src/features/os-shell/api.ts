import { apiClient } from "@/core/api";
import type { ClientListResponse } from "@/features/crm/types";
import type { AutomationJobList, AutomationStats } from "@/features/os/types";
import type { ProjectListResponse } from "@/features/projects/types";
import type { BillingInvoices, BillingSummary } from "@/features/billing/types";

import type { EntityListResponse, NelvyonOutputRow, QaDashboardStats } from "./types";

const CLIENTS = "/api/v1/entities/nelvyon_clients";
const PROJECTS = "/api/v1/entities/nelvyon_projects";
const OUTPUTS = "/api/v1/entities/nelvyon_outputs";
const DEALS = "/api/v1/entities/os_deals";
const TASKS = "/api/v1/entities/os_tasks";

export const osPlatformApi = {
  clients: (limit = 50) =>
    apiClient.get<ClientListResponse>(`${CLIENTS}?skip=0&limit=${limit}`, { tenantScoped: true }),
  projects: (limit = 50) =>
    apiClient.get<ProjectListResponse>(`${PROJECTS}?skip=0&limit=${limit}`, { tenantScoped: true }),
  deals: (limit = 200) =>
    apiClient.get<EntityListResponse<Record<string, unknown>>>(`${DEALS}?skip=0&limit=${limit}`, {
      tenantScoped: true,
    }),
  tasks: (limit = 200) =>
    apiClient.get<EntityListResponse<Record<string, unknown>>>(`${TASKS}?skip=0&limit=${limit}`, {
      tenantScoped: true,
    }),
  outputs: (limit = 50) =>
    apiClient.get<EntityListResponse<NelvyonOutputRow>>(`${OUTPUTS}?skip=0&limit=${limit}`, {
      tenantScoped: true,
    }),
  qaDashboard: () => apiClient.get<QaDashboardStats>("/api/v1/qa/dashboard", { tenantScoped: true }),
  automationStats: () => apiClient.get<AutomationStats>("/api/v1/automation/stats", { tenantScoped: true }),
  recentJobs: () =>
    apiClient.get<AutomationJobList>("/api/v1/automation/jobs?skip=0&limit=8", { tenantScoped: true }),
  billingSummary: () => apiClient.get<BillingSummary>("/api/v1/billing/summary", { tenantScoped: true }),
  billingInvoices: () => apiClient.get<BillingInvoices>("/api/v1/billing/invoices", { tenantScoped: true }),
};
