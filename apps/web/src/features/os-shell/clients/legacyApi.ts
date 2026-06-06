import { apiClient } from "@/core/api";
import { entityListUrl } from "@/features/os-shell/lib/entityQuery";

import type { OsLegacyClient, OsLegacyClientListResponse, OsLegacyClientWriteInput } from "./types";

const BASE = "/api/v1/entities/nelvyon_clients";

/** Legacy nelvyon_clients API — used by pipeline, proyectos, tareas until their UI migrations. */
export const osClientsLegacyApi = {
  list: (params?: {
    skip?: number;
    limit?: number;
    query?: Record<string, string | number>;
    sort?: string;
  }) =>
    apiClient.get<OsLegacyClientListResponse>(
      entityListUrl(BASE, { skip: params?.skip, limit: params?.limit ?? 200, query: params?.query, sort: params?.sort }),
      { tenantScoped: true },
    ),

  getById: (id: number) => apiClient.get<OsLegacyClient>(`${BASE}/${id}`, { tenantScoped: true }),

  create: (body: OsLegacyClientWriteInput) =>
    apiClient.post<OsLegacyClient, OsLegacyClientWriteInput>(BASE, { tenantScoped: true, body }),

  update: (id: number, body: Partial<OsLegacyClientWriteInput>) =>
    apiClient.put<OsLegacyClient, Partial<OsLegacyClientWriteInput>>(`${BASE}/${id}`, { tenantScoped: true, body }),

  delete: (id: number) =>
    apiClient.delete<{ message: string; id: number }>(`${BASE}/${id}`, { tenantScoped: true }),
};

/** @deprecated Use osClientsLegacyApi — kept for modules not yet migrated. */
export const osClientsApi = osClientsLegacyApi;
