import { apiClient } from "@/core/api";
import { entityListUrl } from "@/features/os-shell/lib/entityQuery";

import type { OsLegacyTask, OsLegacyTaskListResponse, OsLegacyTaskWriteInput } from "./types";

const BASE = "/api/v1/entities/os_tasks";

/** Legacy os_tasks entity API — used by OsRelatedOpsSection until full migration. */
export const osTasksLegacyApi = {
  list: (params?: {
    skip?: number;
    limit?: number;
    query?: Record<string, string | number>;
    sort?: string;
  }) =>
    apiClient.get<OsLegacyTaskListResponse>(
      entityListUrl(BASE, {
        skip: params?.skip,
        limit: params?.limit ?? 500,
        query: params?.query,
        sort: params?.sort,
      }),
      { tenantScoped: true },
    ),

  getById: (id: number) => apiClient.get<OsLegacyTask>(`${BASE}/${id}`, { tenantScoped: true }),

  create: (body: OsLegacyTaskWriteInput) =>
    apiClient.post<OsLegacyTask, OsLegacyTaskWriteInput>(BASE, { tenantScoped: true, body }),

  update: (id: number, body: Partial<OsLegacyTaskWriteInput>) =>
    apiClient.put<OsLegacyTask, Partial<OsLegacyTaskWriteInput>>(`${BASE}/${id}`, {
      tenantScoped: true,
      body,
    }),

  delete: (id: number) =>
    apiClient.delete<{ message: string; id: number }>(`${BASE}/${id}`, { tenantScoped: true }),
};

/** @deprecated Use osTasksLegacyApi — kept for OsRelatedOpsSection legacy paths. */
export const osTasksApi = osTasksLegacyApi;
