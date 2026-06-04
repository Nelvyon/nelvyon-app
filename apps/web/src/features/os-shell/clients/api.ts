import { apiClient } from "@/core/api";
import { entityListUrl } from "@/features/os-shell/lib/entityQuery";

import type { OsClient, OsClientListResponse, OsClientWriteInput } from "./types";

const BASE = "/api/v1/entities/nelvyon_clients";

export const osClientsApi = {
  list: (params?: {
    skip?: number;
    limit?: number;
    query?: Record<string, string | number>;
    sort?: string;
  }) =>
    apiClient.get<OsClientListResponse>(
      entityListUrl(BASE, { skip: params?.skip, limit: params?.limit ?? 200, query: params?.query, sort: params?.sort }),
      { tenantScoped: true },
    ),

  getById: (id: number) => apiClient.get<OsClient>(`${BASE}/${id}`, { tenantScoped: true }),

  create: (body: OsClientWriteInput) =>
    apiClient.post<OsClient, OsClientWriteInput>(BASE, { tenantScoped: true, body }),

  update: (id: number, body: Partial<OsClientWriteInput>) =>
    apiClient.put<OsClient, Partial<OsClientWriteInput>>(`${BASE}/${id}`, { tenantScoped: true, body }),

  delete: (id: number) =>
    apiClient.delete<{ message: string; id: number }>(`${BASE}/${id}`, { tenantScoped: true }),
};
