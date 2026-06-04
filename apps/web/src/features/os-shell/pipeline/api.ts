import { apiClient } from "@/core/api";
import { entityListUrl } from "@/features/os-shell/lib/entityQuery";

import type { OsDeal, OsDealListResponse, OsDealWriteInput } from "./types";

const BASE = "/api/v1/entities/os_deals";

export const osDealsApi = {
  list: (params?: {
    skip?: number;
    limit?: number;
    query?: Record<string, string | number>;
    sort?: string;
  }) =>
    apiClient.get<OsDealListResponse>(
      entityListUrl(BASE, {
        skip: params?.skip,
        limit: params?.limit ?? 500,
        query: params?.query,
        sort: params?.sort,
      }),
      { tenantScoped: true },
    ),

  getById: (id: number) => apiClient.get<OsDeal>(`${BASE}/${id}`, { tenantScoped: true }),

  create: (body: OsDealWriteInput) =>
    apiClient.post<OsDeal, OsDealWriteInput>(BASE, { tenantScoped: true, body }),

  update: (id: number, body: Partial<OsDealWriteInput>) =>
    apiClient.put<OsDeal, Partial<OsDealWriteInput>>(`${BASE}/${id}`, { tenantScoped: true, body }),

  delete: (id: number) =>
    apiClient.delete<{ message: string; id: number }>(`${BASE}/${id}`, { tenantScoped: true }),
};
