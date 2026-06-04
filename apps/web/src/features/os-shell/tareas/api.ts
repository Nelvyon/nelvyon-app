import { apiClient } from "@/core/api";
import { entityListUrl } from "@/features/os-shell/lib/entityQuery";

import type { OsTask, OsTaskListResponse, OsTaskWriteInput } from "./types";

const BASE = "/api/v1/entities/os_tasks";

export const osTasksApi = {
  list: (params?: {
    skip?: number;
    limit?: number;
    query?: Record<string, string | number>;
    sort?: string;
  }) =>
    apiClient.get<OsTaskListResponse>(
      entityListUrl(BASE, {
        skip: params?.skip,
        limit: params?.limit ?? 500,
        query: params?.query,
        sort: params?.sort,
      }),
      { tenantScoped: true },
    ),

  getById: (id: number) => apiClient.get<OsTask>(`${BASE}/${id}`, { tenantScoped: true }),

  create: (body: OsTaskWriteInput) =>
    apiClient.post<OsTask, OsTaskWriteInput>(BASE, { tenantScoped: true, body }),

  update: (id: number, body: Partial<OsTaskWriteInput>) =>
    apiClient.put<OsTask, Partial<OsTaskWriteInput>>(`${BASE}/${id}`, { tenantScoped: true, body }),

  delete: (id: number) =>
    apiClient.delete<{ message: string; id: number }>(`${BASE}/${id}`, { tenantScoped: true }),
};
